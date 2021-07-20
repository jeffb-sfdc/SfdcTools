import * as vscode from 'vscode';
import UserSettings from './userSettings';
import * as messageUtilities from './messageUtilities';


export default class SfdcToolsUserSettings extends UserSettings {
	constructor() {
		super();
	}

	public static getSetting(settingName: string): string {
		let setting: string = this.getGroup('sfdctools')[settingName];
		if(!setting || setting.length < 1) {
			vscode.window.showErrorMessage(`Error: missing configuration "sfdctools.${settingName}`, new messageUtilities.DisplayAsModalAlert());
		}

		return setting;
	}
}
