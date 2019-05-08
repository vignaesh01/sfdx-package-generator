"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const vscode = require("vscode");
const child = require("child_process");
var fs = require("fs");
function activate(context) {
    context.subscriptions.push(vscode.commands.registerCommand('sfdxPackageGen.chooseMetadata', () => {
        CodingPanel.createOrShow(context.extensionPath);
    }));
}
exports.activate = activate;
/**
 * Manages cat coding webview panels
 */
class CodingPanel {
    constructor(panel, extensionPath) {
        this._disposables = [];
        this.reportFolderMap = {
            Dashboard: 'DashboardFolder',
            Document: 'DocumentFolder',
            EmailTemplate: 'EmailFolder',
            Report: 'ReportFolder'
        };
        //metadata types that accept * reg exp
        this.regExpArr = ['AccountRelationshipShareRule', 'ActionLinkGroupTemplate', 'ApexClass', 'ApexComponent',
            'ApexPage', 'ApexTrigger', 'AppMenu', 'ApprovalProcess', 'ArticleType', 'AssignmentRules', 'Audience', 'AuthProvider',
            'AuraDefinitionBundle', 'AutoResponseRules', 'Bot', 'BrandingSet', 'CallCenter', 'Certificate', 'CleanDataService',
            'CMSConnectSource', 'Community', 'CommunityTemplateDefinition', 'CommunityThemeDefinition', 'CompactLayout',
            'ConnectedApp', 'ContentAsset', 'CorsWhitelistOrigin', 'CustomApplication', 'CustomApplicationComponent',
            'CustomFeedFilter', 'CustomHelpMenuSection', 'CustomMetadata', 'CustomLabels', 'CustomObjectTranslation',
            'CustomPageWebLink', 'CustomPermission', 'CustomSite', 'CustomTab', 'DataCategoryGroup', 'DelegateGroup',
            'DuplicateRule', 'EclairGeoData', 'EntitlementProcess', 'EntitlementTemplate', 'EventDelivery', 'EventSubscription',
            'ExternalServiceRegistration', 'ExternalDataSource', 'FeatureParameterBoolean', 'FeatureParameterDate', 'FeatureParameterInteger',
            'FieldSet', 'FlexiPage', 'Flow', 'FlowCategory', 'FlowDefinition', 'GlobalValueSet', 'GlobalValueSetTranslation', 'Group', 'HomePageComponent',
            'HomePageLayout', 'InstalledPackage', 'KeywordList', 'Layout', 'LightningBolt', 'LightningComponentBundle', 'LightningExperienceTheme',
            'LiveChatAgentConfig', 'LiveChatButton', 'LiveChatDeployment', 'LiveChatSensitiveDataRule', 'ManagedTopics', 'MatchingRules', 'MilestoneType',
            'MlDomain', 'ModerationRule', 'NamedCredential', 'Network', 'NetworkBranding', 'PathAssistant', 'PermissionSet', 'PlatformCachePartition',
            'Portal', 'PostTemplate', 'PresenceDeclineReason', 'PresenceUserConfig', 'Profile', 'ProfilePasswordPolicy', 'ProfileSessionSetting',
            'Queue', 'QueueRoutingConfig', 'QuickAction', 'RecommendationStrategy', 'RecordActionDeployment', 'ReportType', 'Role', 'SamlSsoConfig',
            'Scontrol', 'ServiceChannel', 'ServicePresenceStatus', 'SharingRules', 'SharingSet', 'SiteDotCom', 'Skill', 'StandardValueSetTranslation',
            'StaticResource', 'SynonymDictionary', 'Territory', 'Territory2', 'Territory2Model', 'Territory2Rule', 'Territory2Type', 'TopicsForObjects',
            'TransactionSecurityPolicy', 'Translations', 'WaveApplication', 'WaveDashboard', 'WaveDataflow', 'WaveDataset', 'WaveLens', 'WaveTemplateBundle',
            'WaveXmd', 'Workflow'];
        this.PACKAGE_START = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
            '<Package xmlns="http://soap.sforce.com/2006/04/metadata">\n';
        this.TYPES_START = '<types>';
        this.TYPES_END = '</types>';
        this.MEMBERS_START = '<members>';
        this.MEMBERS_END = '</members>';
        this.NAME_START = '<name>';
        this.NAME_END = '</name>';
        this.VERSION_START = '<version>';
        this.VERSION_END = '</version>';
        this.PACKAGE_END = '</Package>';
        this.NEW_LINE = '\n';
        this.VERSION_NUM = '45.0';
        this._panel = panel;
        this._extensionPath = extensionPath;
        // Set the webview's initial html content
        this._update();
        // Listen for when the panel is disposed
        // This happens when the user closes the panel or when the panel is closed programatically
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        // Update the content based on view changes
        /*this._panel.onDidChangeViewState(
            e => {
                if (this._panel.visible) {
                    this._update();
                }
            },
            null,
            this._disposables
        );*/
        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'fetchChildren':
                    console.log('onDidReceiveMessage fetchChildren');
                    let metadataType = message.metadataType;
                    this.fetchChildren(metadataType);
                    return;
                case 'buildPackageXML':
                    console.log('onDidReceiveMessage buildPackageXML');
                    this.buildPackageXML(message.selectedNodes);
                    return;
                case 'getMetadataTypes':
                    console.log('onDidReceiveMessage getMetadataTypes');
                    this.getMetadataTypes();
                    return;
            }
        }, null, this._disposables);
    }
    static createOrShow(extensionPath) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;
        // If we already have a panel, show it.
        if (CodingPanel.currentPanel) {
            CodingPanel.currentPanel._panel.reveal(column);
            return;
        }
        // Otherwise, create a new panel.
        const panel = vscode.window.createWebviewPanel(CodingPanel.viewType, 'Choose Metadata Components', column || vscode.ViewColumn.One, {
            // Enable javascript in the webview
            enableScripts: true,
            retainContextWhenHidden: true,
            // And restrict the webview to only loading content from our extension's `media` directory.
            localResourceRoots: [vscode.Uri.file(path.join(extensionPath, 'media'))]
        });
        CodingPanel.currentPanel = new CodingPanel(panel, extensionPath);
    }
    static revive(panel, extensionPath) {
        CodingPanel.currentPanel = new CodingPanel(panel, extensionPath);
    }
    buildPackageXML(selectedNodes) {
        console.log('Invoked buildPackageXML');
        if (!selectedNodes || selectedNodes.length == 0) {
            vscode.window.showErrorMessage("Please select components for package.xml");
            return;
        }
        let mpPackage = this.buildPackageMap(selectedNodes);
        this.generatePackageXML(mpPackage);
    }
    buildPackageMap(selectedNodes) {
        console.log('Invoked buildPackageMap');
        let mpPackage = new Map();
        for (let i = 0; i < selectedNodes.length; i++) {
            let node = selectedNodes[i];
            let parent = node.parent;
            if (parent == '#') {
                //parent node
                if (!mpPackage.has(node.text)) {
                    //new entry
                    if (this.regExpArr.includes(node.text)) {
                        //accepts *
                        mpPackage.set(node.text, ['*']);
                    }
                    else {
                        mpPackage.set(node.text, []);
                    }
                }
                else {
                    if (this.regExpArr.includes(node.text)) {
                        //accepts *
                        mpPackage.set(node.text, ['*']);
                    }
                }
            }
            else {
                //children
                if (!mpPackage.has(parent)) {
                    //metadata type not present
                    mpPackage.set(parent, [node.text]);
                }
                else {
                    let childArr = mpPackage.get(parent);
                    if (!childArr.includes('*')) {
                        //add children only if parent metadata type does not accept *
                        childArr.push(node.text);
                        mpPackage.set(parent, childArr);
                    }
                }
            } //else children end
        } //end for
        for (const [k, v] of mpPackage) {
            console.log(k, v);
        }
        return mpPackage;
    }
    generatePackageXML(mpPackage) {
        console.log('Invoked generatePackageXML');
        //for parent metadata types which have empty children, fetch the children and rebuild the amp entries.
        if (!mpPackage || mpPackage.size == 0) {
            console.log('Invoked generatePackageXML' + mpPackage);
            return mpPackage;
        }
        let xmlString = '';
        xmlString += this.PACKAGE_START;
        for (const [mType, components] of mpPackage) {
            //remove metadata types with empty array values
            if (!components || components.length == 0) {
                continue;
            }
            xmlString += this.TYPES_START + this.NEW_LINE;
            for (const component of components) {
                xmlString += this.MEMBERS_START + component + this.MEMBERS_END + this.NEW_LINE;
            }
            xmlString += this.NAME_START + mType + this.NAME_END + this.NEW_LINE;
            xmlString += this.TYPES_END + this.NEW_LINE;
        }
        xmlString += this.VERSION_START + this.VERSION_NUM + this.VERSION_END + this.NEW_LINE;
        xmlString += this.PACKAGE_END;
        console.log(xmlString);
        fs.writeFile(vscode.workspace.workspaceFolders[0].uri.fsPath + "/manifest/package.xml", xmlString, (err) => {
            if (err) {
                console.log(err);
                vscode.window.showErrorMessage(err);
            }
            console.log("Successfully Written to File.");
            vscode.workspace.openTextDocument(vscode.workspace.workspaceFolders[0].uri.fsPath + "/manifest/package.xml").then(data => {
                console.log('Opened ' + data.fileName);
                vscode.window.showTextDocument(data);
            });
        });
    }
    fetchChildren(metadataType) {
        console.log('Invoked fetchChildren');
        let mType = metadataType.id;
        let node = metadataType.original;
        console.log('Invoked fetchChildren ' + JSON.stringify(node));
        if (!node.inFolder) {
            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Processing Metadata : " + mType,
                cancellable: true
            }, (progress, token) => {
                token.onCancellationRequested(() => {
                    console.log("User canceled the long running operation");
                });
                var p = new Promise(resolve => {
                    let sfdxCmd = "sfdx force:mdapi:listmetadata --json -m " + mType;
                    let foo = child.exec(sfdxCmd, {
                        cwd: vscode.workspace.workspaceFolders[0].uri.fsPath
                    });
                    foo.stdout.on("data", (dataArg) => {
                        console.log('stdout: ' + dataArg);
                        let data = JSON.parse(dataArg);
                        let depArr = [];
                        let results = data.result;
                        this._panel.webview.postMessage({ command: 'listmetadata', results: results, metadataType: mType });
                        resolve();
                    });
                    foo.stderr.on("data", (data) => {
                        console.log('stderr: ' + data);
                        vscode.window.showErrorMessage(data);
                        resolve();
                    });
                    foo.stdin.on("data", (data) => {
                        console.log('stdin: ' + data);
                        //vscode.window.showErrorMessage(data);
                        resolve();
                    });
                });
                return p;
            });
        }
        else {
            //get the folder
            let folderType = this.reportFolderMap[mType];
            let sfdxCmd = "sfdx force:mdapi:listmetadata --json -m " + folderType;
            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Processing Metadata : folderType",
                cancellable: true
            }, (progress, token) => {
                token.onCancellationRequested(() => {
                    console.log("User canceled the long running operation");
                });
                var p = new Promise(resolve => {
                    let foo = child.exec(sfdxCmd, {
                        cwd: vscode.workspace.workspaceFolders[0].uri.fsPath
                    });
                    foo.stdout.on("data", (dataArg) => {
                        console.log('stdout: ' + dataArg);
                        let data = JSON.parse(dataArg);
                        let folderNames = [];
                        let results = data.result;
                        if (!results || results.length == 0) {
                            //no folders
                            this._panel.webview.postMessage({ command: 'listmetadata', results: results, metadataType: mType });
                            return;
                        }
                        else if (!Array.isArray(results)) {
                            //1 folder
                            folderNames.push(results.fullName);
                        }
                        else {
                            //many folders
                            for (let i = 0; i < results.length; i++) {
                                folderNames.push(results[i].fullName);
                            }
                        }
                        //get the components inside each folder
                        this.getComponentsInsideFolders(folderNames, mType, 0, []);
                        resolve();
                    });
                    foo.stderr.on("data", (data) => {
                        console.log('stderr: ' + data);
                        vscode.window.showErrorMessage(data);
                        resolve();
                    });
                    foo.stdin.on("data", (data) => {
                        console.log('stdin: ' + data);
                        resolve();
                    });
                });
                return p;
            });
        }
    }
    getComponentsInsideFolders(folderNames, mType, index, resultsArr) {
        if (index == folderNames.length) {
            this._panel.webview.postMessage({ command: 'listmetadata', results: resultsArr, metadataType: mType });
            return;
        }
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Processing Metadata : " + mType + ":" + folderNames[index],
            cancellable: true
        }, (progress, token) => {
            token.onCancellationRequested(() => {
                console.log("User canceled the long running operation");
            });
            var p = new Promise(resolve => {
                let sfdxCmd = "sfdx force:mdapi:listmetadata --json -m " + mType + " --folder " + folderNames[index];
                let foo = child.exec(sfdxCmd, {
                    cwd: vscode.workspace.workspaceFolders[0].uri.fsPath
                });
                foo.stdout.on("data", (dataArg) => {
                    console.log('stdout: ' + dataArg);
                    let data = JSON.parse(dataArg);
                    let depArr = [];
                    let results = data.result;
                    if (results) {
                        if (!Array.isArray(results)) {
                            //1 folder
                            resultsArr.push(results);
                        }
                        else {
                            //many folders
                            for (let i = 0; i < results.length; i++) {
                                resultsArr.push(results[i]);
                            }
                        }
                    }
                    resolve();
                    console.log('After resolve getComponentsInsideFolders');
                    this.getComponentsInsideFolders(folderNames, mType, ++index, resultsArr);
                });
                foo.stderr.on("data", (data) => {
                    console.log('stderr: ' + data);
                    vscode.window.showErrorMessage(data);
                    resolve();
                });
                foo.stdin.on("data", (data) => {
                    console.log('stdin: ' + data);
                    resolve();
                });
            });
            return p;
        });
    }
    dispose() {
        CodingPanel.currentPanel = undefined;
        // Clean up our resources
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }
    _update() {
        this._panel.title = 'Choose Metadata Components';
        this._panel.webview.html = this._getHtmlForWebview();
        this.getMetadataTypes();
    }
    getMetadataTypes() {
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Processing Metadata",
            cancellable: true
        }, (progress, token) => {
            token.onCancellationRequested(() => {
                console.log("User canceled the long running operation");
            });
            console.log(vscode.workspace.workspaceFolders[0].uri.fsPath);
            var p = new Promise(resolve => {
                var foo = child.exec('sfdx force:mdapi:describemetadata --json', {
                    cwd: vscode.workspace.workspaceFolders[0].uri.fsPath
                });
                foo.stdout.on("data", (dataArg) => {
                    //console.log('stdout: ' + dataArg);
                    let data = JSON.parse(dataArg);
                    let depArr = [];
                    let metadataObjectsArr = data.result.metadataObjects;
                    for (let index = 0; index < metadataObjectsArr.length; index++) {
                        let obj = metadataObjectsArr[index];
                        console.log(obj.xmlName);
                        depArr.push(obj.xmlName);
                    }
                    this._panel.webview.postMessage({ command: 'metadataObjects', metadataObjects: metadataObjectsArr });
                    resolve();
                });
                foo.stderr.on("data", (data) => {
                    console.log('stderr: ' + data);
                    vscode.window.showErrorMessage(data);
                    resolve();
                });
                foo.stdin.on("data", (data) => {
                    console.log('stdin: ' + data);
                    resolve();
                });
                console.log(typeof foo.on);
            });
            return p;
        });
    }
    _getHtmlForWebview() {
        // Local path to main script run in the webview
        const scriptPathOnDisk = vscode.Uri.file(path.join(this._extensionPath, 'media', 'main.js'));
        // And the uri we use to load this script in the webview
        const scriptUri = scriptPathOnDisk.with({ scheme: 'vscode-resource' });
        // Use a nonce to whitelist which scripts can be run
        const nonce = getNonce();
        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">

                <!--
                Use a content security policy to only allow loading images from https or from our extension directory,
                and only allow scripts that have a specific nonce.
                -->
                <!--<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src vscode-resource: https:; script-src 'nonce-${nonce}';">-->
				<meta
				http-equiv="Content-Security-Policy"
				content="default-src 'none'; img-src vscode-resource: https:; script-src vscode-resource: https:; style-src vscode-resource: https:;"
			  />
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/jstree/3.2.1/themes/default/style.min.css" />
				
                <title>Add Components</title>
            </head>
						<body>
						
						<table border="0" width="100%">
						<tr>
						<td><h3>Choose Metadata Components for Package.xml</h3></td>
						<td>
						<button id="buildBtn">Update Package.xml</button>&nbsp;
						<button id="clearAllBtn">Clear All</button>
						</td>
						</tr>
						</table>
						<hr>
				<div id="jstree">
				
			  </div>
			  
			
			  <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js"></script>
			  <script src="https://cdnjs.cloudflare.com/ajax/libs/jstree/3.2.1/jstree.min.js"></script>
			  <script  src="${scriptUri}"></script>
            </body>
            </html>`;
    }
}
CodingPanel.viewType = 'Coding';
function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
//# sourceMappingURL=extension.js.map