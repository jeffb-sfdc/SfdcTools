'use strict';

import * as vscode from 'vscode';
import * as childProcess from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as _ from 'lodash';
//import * as ld from 'lodash';
import * as clipboardy  from 'clipboardy';

import * as gist from '../more-@types/gist-package-json';
import * as scope from './scope';

import * as messageUtilities from './messageUtilities';
import * as MoreLodash from './moreLodash';
import ProjectPackage from './projectPackage';
import SfdcToolsUserSettings from './sfdcToolsUserSettings';



import { PerforceService } from './PerforceService';
import { Display } from './Display';
import { Utils } from './Utils';




// activate() is called when the extension is activated.
// The extension is activated the first time the command is executed.
export function activate(context: vscode.ExtensionContext) {
	//console.log('"SF Tools" is now active!');

	// The commands here are defined in the package.json file.
	// The commandId parameters must match the command fields in package.json.

	let disposableP4LogIn: vscode.Disposable = vscode.commands.registerCommand(
		'extension.sfdcTools.p4LogIn',
		p4LogIn
	);

	let disposableP4CheckOut: vscode.Disposable = vscode.commands.registerCommand(
		'extension.sfdcTools.p4CheckOut',
		p4CheckOut
	);

	let disposableP4Revert: vscode.Disposable = vscode.commands.registerCommand(
		'extension.sfdcTools.p4Revert',
		p4Revert
	);

	let disposableP4Add: vscode.Disposable = vscode.commands.registerCommand(
		'extension.sfdcTools.p4Add',
		p4Add
	);

	let disposableP4Diff: vscode.Disposable = vscode.commands.registerCommand(
		'extension.sfdcTools.p4Diff',
		p4Diff
	);

	let disposableP4DiffRevision: vscode.Disposable = vscode.commands.registerCommand(
		'extension.sfdcTools.p4DiffRevision',
		p4DiffRevision
	);

	// TODO: any other p4 commands?

	let disposableOpenFileInP4V: vscode.Disposable = vscode.commands.registerCommand(
		'extension.sfdcTools.openFileInP4V',
		openFileInP4V
	);

	// TODO: open file in P4V's Workspace tree
	// (P4V needs to support AppleScript first)
	// or use p4vc


	let disposableOpenFileInEclipse: vscode.Disposable = vscode.commands.registerCommand(
		'extension.sfdcTools.openFileInEclipse',
		openFileInEclipse
	);

	let disposableOpenFileInIntelliJ: vscode.Disposable = vscode.commands.registerCommand(
		'extension.sfdcTools.openFileInIntelliJ',
		openFileInIntelliJ
	);

	let disposableOpenFileInSwarm: vscode.Disposable = vscode.commands.registerCommand(
		'extension.sfdcTools.openFileInSwarm',
		openFileInSwarm
	);

	let disposableOpenFileInOpenGrok: vscode.Disposable = vscode.commands.registerCommand(
		'extension.sfdcTools.openFileInOpenGrok',
		openFileInOpenGrok
	);

	let disposableRunCurrentComponentTest: vscode.Disposable = vscode.commands.registerCommand(
		'extension.sfdcTools.runCurrentComponentTest',
		runCurrentComponentTest
	);

	let disposableRunAllComponentTests: vscode.Disposable = vscode.commands.registerCommand(
		'extension.sfdcTools.runAllComponentTests',
		runAllComponentTests
	);

	// TODO: ftest(s) ?

	let disposableCreateUnitTest: vscode.Disposable = vscode.commands.registerCommand(
		'extension.sfdcTools.createUnitTest',
		createUnitTest
	);

	let disposableRunUnitTest: vscode.Disposable = vscode.commands.registerCommand(
		'extension.sfdcTools.runUnitTest',
		runUnitTest
	);

	let disposableRunAllUnitTests: vscode.Disposable = vscode.commands.registerCommand(
		'extension.sfdcTools.runAllUnitTests',
		runAllUnitTests
	);

	let disposableDebugUnitTest: vscode.Disposable = vscode.commands.registerCommand(
		'extension.sfdcTools.debugUnitTest',
		debugUnitTest
	);



	let disposableRunEswCheck: vscode.Disposable = vscode.commands.registerCommand(
		'extension.sfdcTools.runEswCheck',
		runEswCheck
	);

	// TODO: custom search history?

	// TODO: tie into search?
	// TODO: tie into "file locked" dlg box (for when saving)?


	context.subscriptions.push(disposableP4LogIn);
	context.subscriptions.push(disposableP4CheckOut);
	context.subscriptions.push(disposableP4Revert);
	context.subscriptions.push(disposableP4Add);
	context.subscriptions.push(disposableP4Diff);
	context.subscriptions.push(disposableP4DiffRevision);

	context.subscriptions.push(disposableOpenFileInP4V);
	context.subscriptions.push(disposableOpenFileInEclipse);
	context.subscriptions.push(disposableOpenFileInIntelliJ);
	context.subscriptions.push(disposableOpenFileInSwarm);
	context.subscriptions.push(disposableOpenFileInOpenGrok);

	context.subscriptions.push(disposableRunCurrentComponentTest);
	context.subscriptions.push(disposableRunAllComponentTests);
	context.subscriptions.push(disposableCreateUnitTest);
	context.subscriptions.push(disposableRunUnitTest);
	context.subscriptions.push(disposableRunAllUnitTests);
	context.subscriptions.push(disposableDebugUnitTest);

	context.subscriptions.push(disposableRunEswCheck);
}

// This method is called when the extension is deactivated.
export function deactivate() {
	// Nothing to do
}




// ****************************************************************************
// Callbacks

function p4LogIn(): void {
	let filePath: string = getFilePathOfCurrentDocument();
	sendCommandToTerminal(`echo ${SfdcToolsUserSettings.getSetting("p4Password")}|p4 login`);
}

function p4CheckOut(): void {
	let filePath: string = getFilePathOfCurrentDocument();
	sendCommandToTerminal(`p4 edit ${filePath}`);
}

function p4Revert(): void {
	let filePath: string = getFilePathOfCurrentDocument();
	sendCommandToTerminal(`p4 revert -a ${filePath}`);
}

function p4Add(): void {
	let filePath: string = getFilePathOfCurrentDocument();
	sendCommandToTerminal(`p4 add ${filePath}`);
}

function p4Diff(args: any[], revision?: number): void {
	const editor: vscode.TextEditor = vscode.window.activeTextEditor;
	if(!editor || !editor.document) {
		return;
	}

	const doc: vscode.TextDocument = editor.document;
	if(!doc.isUntitled) {
		Utils.getFile('print', doc.uri, revision).then((tmpFile: string) => {
			const tmpFileUri: vscode.Uri = vscode.Uri.file(tmpFile);
			const revisionLabel: string = !revision || isNaN(revision) ? 'Most Recent Revision' : `Revision #${revision}`;
			const filePathToDiffApp: string = SfdcToolsUserSettings.getSetting("filePathToDiffApp");
			if(filePathToDiffApp) {
				childProcess.exec(`"${filePathToDiffApp}" "${tmpFileUri.path}" "${doc.uri.path}"`, (err, stdout, stderr) => {
					if(err) {
						//console.log('error: ' + err);
						showErrorMessage(`Unable to file.  Reason: ${err}`);
					}
				});
			}
			else {
				vscode.commands.executeCommand('vscode.diff', tmpFileUri, doc.uri, path.basename(doc.uri.fsPath) + ' - Diff Against ' + revisionLabel);
			}
		},
		(err) => {
			Display.showError(err.toString());
		});
	}
}

function p4DiffRevision(args: any[]): void {
	const editor: vscode.TextEditor = vscode.window.activeTextEditor;
	/*if (!checkFileSelected()) {
		return false;
	}

	if (!checkFolderOpened()) {
		return false;
	}*/

	if(!editor || !editor.document) {
		return;
	}

	const doc: vscode.TextDocument = editor.document;

	const diffArgs: string = '-s "' + Utils.expansePath(doc.uri.fsPath) + '"';
	PerforceService.execute(doc.uri, 'filelog', (err, stdout, stderr) => {
		if(err) {
			Display.showError(err.message);
		}
		else if(stderr) {
			Display.showError(stderr.toString());
		}
		else {
			let revisions: string[] = stdout.split('\n');
			let revisionsData: vscode.QuickPickItem[] = [];
			revisions.shift();  // remove the first line - filename
			revisions.forEach(revisionInfo => {
				if(revisionInfo.indexOf('... #') === -1) {
					return;
				}

				let splits: string[] = revisionInfo.split(' ');
				let rev: string = splits[1].substring(1);    // splice 1st character '#'
				let change: string = splits[3];
				let label: string = `#${rev} change: ${change}`;
				let description: string = revisionInfo.substring(revisionInfo.indexOf(splits[9]) + splits[9].length + 1);

				revisionsData.push({
					label,
					description
				});
			});

			vscode.window.showQuickPick(revisionsData).then( revision => {
				if(revision) {
					//this.diff(parseInt(revision.label.substring(1)));
					const subStr: string = revision.label.substring(1);
					const parsedSubStr: number = parseInt(subStr);
					p4Diff(args, parsedSubStr);
				}
			});
		}
	}, diffArgs);
}


function openFileInP4V(): void {
	let filePath: string = getFilePathOfCurrentDocument();
	clipboardy.writeSync(filePath);
	// Could also use node-copy-paste
	// https://github.com/xavi-/node-copy-paste
	// see https://github.com/Microsoft/vscode/issues/4972

	let fileName: string = path.basename(filePath);
	sendCommandToTerminal(`echo 'The file path to "${fileName}" has been copied to the clipboard.'`);

	// TODO: better integration with P4V
	// Once P4V supports AppleScript, change over and use AppleScript to navigate to the file in the workspace tree

	openFileInApplication(
		SfdcToolsUserSettings.getSetting("filePathToP4V"),
		filePath
	);
}

function openFileInEclipse(): void {
	openFileInApplication(
		//ProjectPackage.customSettings["filePathToEclipse"],
		//UserSettings.getGroup("sfdctools")["filePathToEclipse"],
		SfdcToolsUserSettings.getSetting("filePathToEclipse"),
		getFilePathOfCurrentDocument()
	);
}

function openFileInIntelliJ(): void {
	openFileInApplication(
		SfdcToolsUserSettings.getSetting("filePathToIntelliJ"),
		getFilePathOfCurrentDocument()
	);
}

function openFileInSwarm(): void {
	openFileInApplication(
		SfdcToolsUserSettings.getSetting("filePathToBrowser"),
		"https://swarm.soma.salesforce.com/files/" + getSourceControlPathOfCurrentDocument()
	);
}

function openFileInOpenGrok(): void {
	let sourceControlPath: string = getSourceControlPathOfCurrentDocument();
	let pathSplit: string[] = sourceControlPath.split("/");
	let prefix: string = (pathSplit[1] === "main")
							? "app_main_core/"
							: `app_${pathSplit[1]}_${pathSplit[2]}_core/`;
	openFileInApplication(
		SfdcToolsUserSettings.getSetting("filePathToBrowser"),
		`https://codesearch.data.sfdc.net/source/xref/${prefix}${sourceControlPath}`
	);
}


function runCurrentComponentTest(): void {
	// Get the current file's parent directory's path
	let filePath: string = vscode.window.activeTextEditor.document.fileName;
	let parentDirectoryPath: string = path.dirname(filePath);
	let parentDirectoryName: string = path.basename(parentDirectoryPath);

	// List a list of the files within the directory
	fs.readdir(parentDirectoryPath, function(err, items) {
		if(err) {
			showErrorMessage(`Unable to run component test.  Reason: \n\n${err}`);
			return;
		}

		if( !checkForFileNameWithCmp(items, parentDirectoryPath) ) {
			return;
		}

		if( !checkForFileNameWithTest(items, parentDirectoryPath) ) {
			return;
		}

		// Find the name of the function the caret is in
		let scopeFinder = new scope.ScopeFinder(vscode.window.activeTextEditor.document);
		let selection = vscode.window.activeTextEditor.selection;
		scopeFinder.getScopeNode(selection.start)
			.then(function(result) {
				let nameOfTest: string = undefined;
				if(result.symbolInfo && result.symbolInfo.name) {
					nameOfTest = result.symbolInfo.name;
				}
				else {
					let selection = vscode.window.activeTextEditor.selection;
					nameOfTest = vscode.window.activeTextEditor.document.getText(selection);
				}

				if(nameOfTest) {
					if(nameOfTest.startsWith("test")) {
						openFileInApplication(
							SfdcToolsUserSettings.getSetting("filePathToBrowser"),
							`${SfdcToolsUserSettings.getSetting("localOrgDomain")}/embeddedService/${parentDirectoryName}.cmp?aura.mode=JSTESTDEBUG&aura.jstest=${nameOfTest}`
						);
					}
					else {
						showErrorMessage(`Unable to run component test.  The function's name (${nameOfTest}) needs to start with 'test' (like 'testQueuePositionDisabled').`);
					}
				}
				else {
					showErrorMessage(`Unable to run component test.  Couldn't find the function name from the caret's location.`);
				}
			}, function(err) {
				showErrorMessage(`Unable to run component test.  An exception ws thrown:\n\n${err}`);
			});
	});
}

function runAllComponentTests(): void {
	let filePath: string = vscode.window.activeTextEditor.document.fileName;
	let parentDirectoryPath: string = path.dirname(filePath);
	let parentDirectoryName: string = path.basename(parentDirectoryPath);

	fs.readdir(parentDirectoryPath, function(err, items) {
		if(err) {
			showErrorMessage(`Unable to run component test.  Reason: \n\n${err}`);
			return;
		}

		if( !checkForFileNameWithCmp(items, parentDirectoryPath) ) {
			return;
		}

		if( !checkForFileNameWithTest(items, parentDirectoryPath) ) {
			return;
		}

		openFileInApplication(
			SfdcToolsUserSettings.getSetting("filePathToBrowser"),
			`${SfdcToolsUserSettings.getSetting("localOrgDomain")}/embeddedService/${parentDirectoryName}.cmp?aura.mode=JSTESTDEBUG`
		);
	});
}

function createUnitTest(): void {
	// TODO
	/*
		-keep copy of template in code
		-WriteTemplateIfNotFound()
			write the template (with wild cards) to the home directory, call it unitTestTemplate.js
		-ReadTemplate()
		-gather wildcards
			file path
			name of test file
				use current file
					if doesn't end in *Controller.js or *Helper.js, give error
			name of test
				use selected text
				if no selection, ignore

		-ReplaceWildcards()
		-SaveUnitTestFile()
		-OpenUnitTestFile()
	*/
}

function runUnitTest(): void {
	// TODO
}

function runAllUnitTests(): void {
	// TODO
}

function debugUnitTest(): void {
	// TODO
	/*
		1. check that .sh exists in home directory
			if it doesn't exist, create error, and display link to where to create'
		2. run in browser
	*/
}


function runEswCheck(): void {
	let sourceControlPath: string = getSourceControlPathOfCurrentDocument();
	let pathSplit: string[] = sourceControlPath.split("/");
	let branch: string = (pathSplit[1] === "main")
							? "main"
							: `${pathSplit[1]}/${pathSplit[2]}`;
	sendCommandToTerminal(`eswcheck ${branch}`);
}



// ****************************************************************************
// Helper functions

function checkForFileNameWithCmp(items: string[], parentDirectoryPath: string): boolean {
	if( !directoryContainsAComponentFile(items) ) {
		showErrorMessage(`Unable to run component test.  The current directory is:\n\n${parentDirectoryPath}\n\n...but a file ending with '.cmp' was not found.`);
		return false;
	}

	return true;
}

function checkForFileNameWithTest(items: string[], parentDirectoryPath: string): boolean {
	if( !directoryContainsAComponentTestFile(items) ) {
		showErrorMessage(`Unable to run component test.  The current directory is\n\n${parentDirectoryPath}\n\n...but a file starting with 'test' was not found.`);
		return false;
	}

	return true;
}

function showErrorMessage(message: string): void {
	vscode.window.showErrorMessage(message, new messageUtilities.DisplayAsModalAlert());
}

function sendCommandToTerminal(command: string): void {
	let projectPackage: gist.IPackage = ProjectPackage.getInstance().projectPackage;
	let terminals: ReadonlyArray<vscode.Terminal> = vscode.window.terminals;
	let terminal: vscode.Terminal = (!terminals || terminals.length < 1)
										? vscode.window.createTerminal(projectPackage.displayName)
										: terminals[0];
	terminal.show();
	terminal.sendText(command);
}

function getFilePathOfCurrentDocument(): string {
	return vscode.window.activeTextEditor.document.fileName;
}

function getSourceControlPathOfCurrentDocument(): string {
	let filePath: string = getFilePathOfCurrentDocument();
	let token: string = "/blt/";
	let index: number = filePath.indexOf(token) + token.length;
	let sourceControlPath: string = filePath.substr(index);

	return sourceControlPath;
}

function openFileInApplication(appPath: string, filePath: string) {
	childProcess.exec(`open -a "${appPath}" "${filePath}"`, (err, stdout, stderr) => {
		//console.log('stdout: ' + stdout);
		//console.log('stderr: ' + stderr);
		if(err) {
			//console.log('error: ' + err);
			showErrorMessage(`Unable to file.  Reason: ${err}`);
		}
	});
}

function directoryContainsAComponentFile(items: string[]): boolean {
	return MoreLodash.containsMatch(items, (item: string) => {
		return item.endsWith(".cmp");
	});
}

function directoryContainsAComponentTestFile(items: string[]): boolean {
	return MoreLodash.containsMatch(items, (item: string) => {
		return item.endsWith("Test.js");
	});
}
