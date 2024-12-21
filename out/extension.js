"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const child = __importStar(require("child_process"));
let clipboardy;
var fs = require("fs");
var xml2js = require('xml2js');
let DEFAULT_API_VERSION = '';
function activate(context) {
    context.subscriptions.push(vscode.commands.registerCommand('sfdxPackageGen.chooseMetadata', async () => {
        // Dynamically import clipboardy
        const module = await import('clipboardy');
        clipboardy = module.default || module; // Handle both default and named exports
        //check whether clipboardy got imported correctly
        console.log(clipboardy);
        DEFAULT_API_VERSION = await getAPIVersion();
        console.log('DEFAULT_API_VERSION ' + DEFAULT_API_VERSION);
        CodingPanel.createOrShow(context.extensionPath);
    }));
}
function getAPIVersion() {
    console.log('getAPIVersion invoked');
    return new Promise((resolve, reject) => {
        let sfdxCmd = "sf org display --json";
        let foo = child.exec(sfdxCmd, {
            maxBuffer: 1024 * 1024 * 6,
            cwd: vscode.workspace.workspaceFolders[0].uri.fsPath
        });
        let bufferOutData = '';
        foo.stdout.on("data", (dataArg) => {
            console.log('stdout: ' + dataArg);
            bufferOutData += dataArg;
        });
        /*foo.stderr.on("data",(data : any)=> {
            console.log('stderr: ' + data);
            //vscode.window.showErrorMessage(data);
            resolve(undefined);
        });

        foo.stdin.on("data",(data : any)=> {
            console.log('stdin: ' + data);
            resolve(undefined);
        });*/
        foo.on("exit", (code, signal) => {
            console.log("exited with code " + code);
            console.log("bufferOutData " + bufferOutData);
            let data = JSON.parse(bufferOutData);
            let apiVersion = data.result.apiVersion;
            console.log('apiVersion ' + apiVersion);
            resolve(apiVersion);
        });
    });
}
/**
 * Manages cat coding webview panels
 */
class CodingPanel {
    /**
     * Track the currently panel. Only allow a single panel to exist at a time.
     */
    static currentPanel;
    static viewType = 'Coding';
    _panel;
    _extensionPath;
    _disposables = [];
    reportFolderMap = {
        Dashboard: 'DashboardFolder',
        Document: 'DocumentFolder',
        EmailTemplate: 'EmailFolder',
        Report: 'ReportFolder'
    };
    //Modified for #18
    //metadata types that accept * reg exp
    regExpArr = ['AccountRelationshipShareRule', 'ActionLinkGroupTemplate', 'ApexClass', 'ApexComponent',
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
        'WaveXmd', 'Workflow',
        'ActionPlanTemplate',
        'AnimationRule',
        'ChannelLayout',
        'ApexTestSuite',
        'AppointmentSchedulingPolicy',
        'CampaignInfluenceModel',
        'ChatterExtension',
        'CspTrustedSite',
        'CompactLayout',
        'ExperienceBundle',
        'LightningMessageChannel',
        'MyDomainDiscoverableLogin',
        'NavigationMenu',
        'OauthCustomScope',
        'PaymentGatewayProvider',
        'PlatformEventChannel',
        'PlatformEventChannelMember',
        'Prompt',
        'RedirectWhitelistUrl',
        'Settings',
        'TimeSheetTemplate',
        'WaveRecipe',
        'WorkSkillRouting'];
    PACKAGE_START = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
        '<Package xmlns="http://soap.sforce.com/2006/04/metadata">\n';
    TYPES_START = '<types>';
    TYPES_END = '</types>';
    MEMBERS_START = '<members>';
    MEMBERS_END = '</members>';
    NAME_START = '<name>';
    NAME_END = '</name>';
    VERSION_START = '<version>';
    VERSION_END = '</version>';
    PACKAGE_END = '</Package>';
    NEW_LINE = '\n';
    VERSION_NUM = DEFAULT_API_VERSION;
    CHAR_TAB = '\t';
    LOADING = '*loading..';
    infoMsg = 'All metadata selected except ';
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
            //localResourceRoots: [vscode.Uri.file(path.join(extensionPath, 'media'))]Commented for UI Changes
        });
        //get the API version
        CodingPanel.currentPanel = new CodingPanel(panel, extensionPath);
    }
    static revive(panel, extensionPath) {
        CodingPanel.currentPanel = new CodingPanel(panel, extensionPath);
    }
    constructor(panel, extensionPath) {
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
        this._panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'fetchChildren':
                    console.log('onDidReceiveMessage fetchChildren');
                    let metadataType = message.metadataType;
                    this.fetchChildren(metadataType);
                    return;
                case 'buildPackageXML':
                    console.log('onDidReceiveMessage buildPackageXML');
                    this.buildPackageXML(message.selectedNodes, false);
                    return;
                case 'getMetadataTypes':
                    console.log('onDidReceiveMessage getMetadataTypes');
                    this.getMetadataTypes({});
                    return;
                case 'copyToClipboard':
                    console.log('onDidReceiveMessage copyToClipboard');
                    //clipboardy = await import('clipboardy');
                    this.buildPackageXML(message.selectedNodes, true);
                    return;
                case 'selectAll':
                    console.log('onDidReceiveMessage selectAll');
                    let selectedMetadata = message.selectedMetadata;
                    let skippedMetadataTypes = message.skippedMetadataTypes; //Added for #18
                    this.fetchAllChildren(selectedMetadata, skippedMetadataTypes, 0);
                    return;
                //Added for UI Changes - starts
                case 'INIT_LOAD_REQUEST':
                    console.log('onDidReceiveMessage INIT_LOAD_REQUEST');
                    this.handleInitLoadRequest();
                    return;
                case 'FETCH_CHILDREN_REQUEST':
                    console.log('onDidReceiveMessage FETCH_CHILDREN');
                    this.fetchChildren(message.metadataType);
                    return;
                case 'UPDATE_PACKAGE_XML':
                    console.log('onDidReceiveMessage UPDATE_PACKAGE_XML');
                    this.handleUpdatePackageXml(message.metadataTypes);
                    return;
                case 'COPY_TO_CLIPBOARD':
                    console.log('onDidReceiveMessage COPY_TO_CLIPBOARD');
                    //clipboardy = await import('clipboardy');
                    this.handleCopyToClipboard(message.metadataTypes);
                    return;
                case 'OPEN_URL':
                    console.log('onDidReceiveMessage OPEN_URL');
                    this.openUrl(message.url);
                    return;
                //Added for Ui Changes - ends
            }
        }, null, this._disposables);
    }
    buildPackageXML(selectedNodes, isCopyToClipboard) {
        console.log('Invoked buildPackageXML');
        if (!selectedNodes || selectedNodes.length == 0) {
            vscode.window.showErrorMessage("Please select components for package.xml");
            return;
        }
        let mpPackage = this.buildPackageMap(selectedNodes);
        this.generatePackageXML(mpPackage, isCopyToClipboard);
    }
    buildPackageMap(selectedNodes) {
        console.log('Invoked buildPackageMap');
        let mpPackage = new Map();
        for (let i = 0; i < selectedNodes.length; i++) {
            let node = selectedNodes[i];
            let parent = node.parent;
            //do not add loading child node to final map
            if (node.text == this.LOADING) {
                continue;
            }
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
    generatePackageXML(mpPackage, isCopyToClipboard) {
        console.log('Invoked generatePackageXML');
        //for parent metadata types which have empty children, fetch the children and rebuild the map entries.
        if (!mpPackage || mpPackage.size == 0) {
            console.log('Invoked generatePackageXML' + mpPackage);
            return mpPackage;
        }
        let xmlString = '';
        xmlString += this.PACKAGE_START;
        let mpKeys = [];
        for (let key of mpPackage.keys()) {
            mpKeys.push(key);
        }
        //	mpKeys=mpKeys.sort();
        console.log(mpKeys);
        let mpSortedKeys = mpKeys.sort();
        console.log(mpSortedKeys);
        //	for (const [mType, components] of mpPackage) {
        for (let mType of mpKeys) {
            let components = mpPackage.get(mType);
            //remove metadata types with empty array values
            if (!components || components.length == 0) {
                continue;
            }
            components = components.sort();
            //console.log(components);
            xmlString += this.CHAR_TAB + this.TYPES_START + this.NEW_LINE;
            for (const component of components) {
                xmlString += this.CHAR_TAB + this.CHAR_TAB + this.MEMBERS_START + component + this.MEMBERS_END + this.NEW_LINE;
            }
            xmlString += this.CHAR_TAB + this.CHAR_TAB + this.NAME_START + mType + this.NAME_END + this.NEW_LINE;
            xmlString += this.CHAR_TAB + this.TYPES_END + this.NEW_LINE;
        }
        xmlString += this.CHAR_TAB + this.VERSION_START + this.VERSION_NUM + this.VERSION_END + this.NEW_LINE;
        xmlString += this.PACKAGE_END;
        console.log(xmlString);
        if (isCopyToClipboard) {
            console.log('Copy to Clipboard - Initiated');
            console.log(clipboardy);
            clipboardy.write(xmlString).then((result) => {
                console.log(result);
                vscode.window.showInformationMessage("Contents Copied to Clipboard successfully!!");
            });
        }
        else {
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
    }
    fetchChildren(metadataType) {
        console.log('Invoked fetchChildren');
        let mType = metadataType.id;
        //Modified for UI Changes - starts
        //let node = metadataType.original;
        let node = metadataType;
        //Modified for UI Changes - ends
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
                    let sfdxCmd = "sf org list metadata --api-version " + this.VERSION_NUM + " --json -m " + mType;
                    let foo = child.exec(sfdxCmd, {
                        maxBuffer: 1024 * 1024 * 8,
                        cwd: vscode.workspace.workspaceFolders[0].uri.fsPath
                    });
                    let bufferOutData = '';
                    foo.stdout.on("data", (dataArg) => {
                        console.log('stdout: ' + dataArg);
                        bufferOutData += dataArg;
                        /*let data = JSON.parse(dataArg);
                        let depArr=[];
                        let results = data.result;
                        this._panel.webview.postMessage({ command: 'listmetadata', results : results , metadataType : mType});
                        resolve();*/
                    });
                    foo.stderr.on("data", (data) => {
                        console.log('stderr: ' + data);
                        //vscode.window.showErrorMessage(data);
                        resolve(undefined);
                    });
                    foo.stdin.on("data", (data) => {
                        console.log('stdin: ' + data);
                        //vscode.window.showErrorMessage(data);
                        resolve(undefined);
                    });
                    foo.on('exit', (code, signal) => {
                        console.log('exit code ' + code);
                        console.log('bufferOutData ' + bufferOutData);
                        let data = JSON.parse(bufferOutData);
                        let depArr = [];
                        let results = data.result;
                        this._panel.webview.postMessage({ command: 'listmetadata', results: results, metadataType: mType });
                        resolve();
                    });
                });
                return p;
            });
        }
        else {
            //get the folder
            let folderType = this.reportFolderMap[mType];
            let sfdxCmd = "sf org list metadata --json --api-version " + this.VERSION_NUM + " -m " + folderType;
            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Processing Metadata : " + folderType,
                cancellable: true
            }, (progress, token) => {
                token.onCancellationRequested(() => {
                    console.log("User canceled the long running operation");
                });
                var p = new Promise(resolve => {
                    let foo = child.exec(sfdxCmd, {
                        maxBuffer: 1024 * 1024 * 6,
                        cwd: vscode.workspace.workspaceFolders[0].uri.fsPath
                    });
                    let bufferOutData = '';
                    foo.stdout.on("data", (dataArg) => {
                        console.log('stdout: ' + dataArg);
                        bufferOutData += dataArg;
                        /*let data = JSON.parse(dataArg);
                        let folderNames=[];
                        let results = data.result;
                        
                        if(!results || results.length==0){
                            //no folders
                            this._panel.webview.postMessage({ command: 'listmetadata', results : results , metadataType : mType});
                            return;
                        }else if(!Array.isArray(results)){
                            //1 folder
                            folderNames.push(results.fullName);
                        }else{
                            //many folders
                            for(let i=0;i<results.length;i++){
                                folderNames.push(results[i].fullName);
                            }
                        }
            
                    //get the components inside each folder
                    this.getComponentsInsideFolders(folderNames,mType,0,[]);
                    resolve();*/
                    });
                    foo.stderr.on("data", (data) => {
                        console.log('stderr: ' + data);
                        //vscode.window.showErrorMessage(data);
                        resolve(undefined);
                    });
                    foo.stdin.on("data", (data) => {
                        console.log('stdin: ' + data);
                        resolve(undefined);
                    });
                    foo.on('exit', (code, signal) => {
                        console.log('exit code ' + code);
                        console.log('bufferOutData ' + bufferOutData);
                        let data = JSON.parse(bufferOutData);
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
                        resolve(undefined);
                    });
                });
                return p;
            });
        }
    }
    fetchAllChildren(selectedMetadata, skippedMetadataTypes, index) {
        console.log('Invoked fetchAllChildren');
        if (!selectedMetadata || selectedMetadata.length == 0) {
            return;
        }
        if (index == selectedMetadata.length) { //end condition
            let mpKeys = [];
            for (let key in this.reportFolderMap) {
                mpKeys.push(key);
            }
            vscode.window.showInformationMessage(this.infoMsg + skippedMetadataTypes.join()); //Modified for #18
            return;
        }
        let mType = selectedMetadata[index];
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Processing Metadata : " + mType,
            cancellable: true
        }, (progress, token) => {
            token.onCancellationRequested(() => {
                console.log("User canceled the long running operation");
            });
            var p = new Promise(resolve => {
                let sfdxCmd = "sf org list metadata --json --api-version " + this.VERSION_NUM + " -m " + mType;
                let foo = child.exec(sfdxCmd, {
                    maxBuffer: 1024 * 1024 * 6,
                    cwd: vscode.workspace.workspaceFolders[0].uri.fsPath
                });
                let bufferOutData = '';
                foo.stdout.on("data", (dataArg) => {
                    console.log('stdout: ' + dataArg);
                    bufferOutData += dataArg;
                    /*let data = JSON.parse(dataArg);
                    let depArr=[];
                    let results = data.result;
                    this._panel.webview.postMessage({ command: 'listmetadata', results : results , metadataType : mType});
                    resolve();*/
                });
                foo.stderr.on("data", (data) => {
                    console.log('stderr: ' + data);
                    //vscode.window.showErrorMessage(data);
                    resolve(undefined);
                });
                foo.stdin.on("data", (data) => {
                    console.log('stdin: ' + data);
                    //vscode.window.showErrorMessage(data);
                    resolve(undefined);
                });
                foo.on('exit', (code, signal) => {
                    console.log('exit code ' + code);
                    console.log('bufferOutData ' + bufferOutData);
                    let data = JSON.parse(bufferOutData);
                    let depArr = [];
                    let results = data.result;
                    this._panel.webview.postMessage({ command: 'listmetadata', results: results, metadataType: mType });
                    resolve(undefined);
                    this.fetchAllChildren(selectedMetadata, skippedMetadataTypes, ++index); //recurse through other metadata
                });
            });
            return p;
        });
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
                let sfdxCmd = "sf org list metadata --json --api-version " + this.VERSION_NUM + " -m " + mType + " --folder " + folderNames[index];
                let foo = child.exec(sfdxCmd, {
                    maxBuffer: 1024 * 1024 * 6,
                    cwd: vscode.workspace.workspaceFolders[0].uri.fsPath
                });
                let bufferOutData = '';
                foo.stdout.on("data", (dataArg) => {
                    console.log('stdout: ' + dataArg);
                    bufferOutData += dataArg;
                    /*let data = JSON.parse(dataArg);
                    let depArr=[];
                    let results = data.result;
    
                    if(results){
                        if(!Array.isArray(results)){
                            //1 folder
                            resultsArr.push(results);
                        }else{
                            //many folders
                            for(let i=0;i<results.length;i++){
                                resultsArr.push(results[i]);
                            }
                        }
                }
                    
                    resolve();
                    console.log('After resolve getComponentsInsideFolders');
                    this.getComponentsInsideFolders(folderNames,mType,++index,resultsArr);*/
                });
                foo.stderr.on("data", (data) => {
                    console.log('stderr: ' + data);
                    //vscode.window.showErrorMessage(data);
                    resolve(undefined);
                });
                foo.stdin.on("data", (data) => {
                    console.log('stdin: ' + data);
                    resolve(undefined);
                });
                foo.on('exit', (code, signal) => {
                    console.log('exit code ' + code);
                    console.log('bufferOutData ' + bufferOutData);
                    let data = JSON.parse(bufferOutData);
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
                    resolve(undefined);
                    console.log('After resolve getComponentsInsideFolders');
                    this.getComponentsInsideFolders(folderNames, mType, ++index, resultsArr);
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
        //Commented for UI Changes - starts
        /*this.readExistingPackageXML().then(mpExistingPackageXML=>{
            this.getMetadataTypes(mpExistingPackageXML);
        }).catch(err=>{
            console.log(err);
        });*/
        //Commented for Ui Changes - ends
    }
    //Added for UI Changes - starts
    handleInitLoadRequest() {
        this.readExistingPackageXML().then(mpExistingPackageXML => {
            this.getMetadataTypes(mpExistingPackageXML);
        }).catch(err => {
            console.log(err);
        });
    }
    handleUpdatePackageXml(metadataTypes) {
        const mpPackage = this.buildSelectedMetadataMap(metadataTypes);
        if (mpPackage.size == 0) {
            vscode.window.showErrorMessage("Please select components for package.xml");
            return;
        }
        this.generatePackageXML(mpPackage, false);
    }
    handleCopyToClipboard(metadataTypes) {
        const mpPackage = this.buildSelectedMetadataMap(metadataTypes);
        if (mpPackage.size == 0) {
            vscode.window.showErrorMessage("Please select components for package.xml");
            return;
        }
        this.generatePackageXML(mpPackage, true);
    }
    openUrl(url) {
        vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(url));
    }
    buildSelectedMetadataMap(metadataTypes) {
        const mpPackage = new Map();
        if (!metadataTypes || metadataTypes.length == 0) {
            return mpPackage;
        }
        metadataTypes.forEach(metadataType => {
            if (metadataType.isSelected) {
                //Add to Map
                if (this.regExpArr.includes(metadataType.id)) {
                    //accepts *
                    mpPackage.set(metadataType.id, ['*']);
                }
                else {
                    const childrenArr = metadataType.children.map(child => child.text);
                    mpPackage.set(metadataType.id, childrenArr);
                }
            }
            else if (metadataType.isIndeterminate) {
                const childrenArr = [];
                metadataType.children.forEach(child => {
                    if (child.isSelected) {
                        childrenArr.push(child.text);
                    }
                });
                mpPackage.set(metadataType.id, childrenArr);
            }
        });
        return mpPackage;
    }
    //Added for UI Changes - ends
    readExistingPackageXML() {
        console.log('Read existing packge.xml');
        let mpExistingPackageXML = {};
        let parser = new xml2js.Parser();
        return new Promise((resolve, reject) => {
            fs.readFile(vscode.workspace.workspaceFolders[0].uri.fsPath + "/manifest/package.xml", function (err, data) {
                if (err) {
                    console.error(err);
                    resolve(mpExistingPackageXML);
                }
                parser.parseString(data, function (err, result) {
                    if (err) {
                        console.error(err);
                        resolve(mpExistingPackageXML);
                        //return;
                    }
                    console.log('Existing package.xml');
                    console.log(JSON.stringify(result));
                    ///mpExistingPackageXML=this.putExistingPackageXMLInMap(result);
                    if (!result || !result.Package || !result.Package.types) {
                        resolve(mpExistingPackageXML);
                    }
                    let types = result.Package.types;
                    for (let i = 0; i < types.length; i++) {
                        let type = types[i];
                        let name = type.name[0];
                        let members = type.members;
                        //Commented for UI Changes - starts
                        //for setting undetermined state
                        /*if(members && !members.includes("*")){
                            members.push("*loading..");
                        }*/
                        //Commented for UI Changes - ends
                        mpExistingPackageXML[name] = members;
                    }
                    console.log(mpExistingPackageXML);
                    resolve(mpExistingPackageXML);
                });
            });
        });
    }
    getMetadataTypes(mpExistingPackageXML) {
        console.log("getMetadataTypes invoked");
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Processing Metadata",
            cancellable: true
        }, (progress, token) => {
            token.onCancellationRequested(() => {
                console.log("User canceled the long running operation");
            });
            console.log("vscode.workspace.workspaceFolders[0].uri.fsPath " + vscode.workspace.workspaceFolders[0].uri.fsPath);
            var p = new Promise(resolve => {
                var foo = child.exec('sf org list metadata-types --api-version ' + this.VERSION_NUM + ' --json', {
                    maxBuffer: 1024 * 1024 * 6,
                    cwd: vscode.workspace.workspaceFolders[0].uri.fsPath
                });
                let bufferOutData = '';
                foo.stdout.on("data", (dataArg) => {
                    console.log('dataArg ' + dataArg);
                    bufferOutData += dataArg;
                    /*let data = JSON.parse(dataArg);
                    let depArr=[];
                    let metadataObjectsArr = data.result.metadataObjects;
        
                    for(let index=0;index<metadataObjectsArr.length;index++){
                        let obj=metadataObjectsArr[index];
                        console.log(obj.xmlName);
                        depArr.push(obj.xmlName);
                    }
                    this._panel.webview.postMessage({ command: 'metadataObjects', metadataObjects: metadataObjectsArr});
                    resolve();*/
                });
                foo.stderr.on("data", (data) => {
                    console.log('stderr: ' + data);
                    //vscode.window.showErrorMessage(data);
                    resolve(undefined);
                });
                foo.stdin.on("data", (data) => {
                    console.log('stdin: ' + data);
                    resolve(undefined);
                });
                foo.on("exit", (code, signal) => {
                    console.log("exited with code " + code);
                    console.log("bufferOutData " + bufferOutData);
                    resolve(undefined);
                    let data = JSON.parse(bufferOutData);
                    let depArr = [];
                    let metadataObjectsArr = data.result.metadataObjects;
                    for (let index = 0; index < metadataObjectsArr.length; index++) {
                        let obj = metadataObjectsArr[index];
                        console.log(obj.xmlName);
                        depArr.push(obj.xmlName);
                    }
                    this._panel.webview.postMessage({ command: 'metadataObjects', metadataObjects: metadataObjectsArr,
                        'mpExistingPackageXML': mpExistingPackageXML });
                });
                console.log(typeof foo.on);
            });
            return p;
        });
    }
    _getHtmlForWebview() {
        //Added for UI Changes - starts
        const manifest = require(path.join(this._extensionPath, 'client', 'build', 'asset-manifest.json'));
        const entrypoints = manifest['entrypoints'];
        const scriptEntryPoints = [];
        const styleEntryPoints = [];
        entrypoints.forEach(entrypoint => {
            if (entrypoint.endsWith('.js')) {
                scriptEntryPoints.push(entrypoint);
            }
            else {
                styleEntryPoints.push(entrypoint);
            }
        });
        const scriptPathOnDisk = vscode.Uri.file(path.join(this._extensionPath, 'client', 'build', scriptEntryPoints[0]));
        //const scriptUri = scriptPathOnDisk.with({ scheme: 'vscode-resource' });
        const scriptUri = this._panel.webview.asWebviewUri(scriptPathOnDisk);
        const runtimeScriptPathOnDisk = vscode.Uri.file(path.join(this._extensionPath, 'client', 'build', scriptEntryPoints[1]));
        //const runtimeScriptUri = runtimeScriptPathOnDisk.with({ scheme: 'vscode-resource' });
        const runtimeScriptUri = this._panel.webview.asWebviewUri(runtimeScriptPathOnDisk);
        const staticScriptPathOnDisk = vscode.Uri.file(path.join(this._extensionPath, 'client', 'build', scriptEntryPoints[2]));
        //const staticScriptUri = staticScriptPathOnDisk.with({ scheme: 'vscode-resource' });
        const staticScriptUri = this._panel.webview.asWebviewUri(staticScriptPathOnDisk);
        const stylePathOnDisk = vscode.Uri.file(path.join(this._extensionPath, 'client', 'build', styleEntryPoints[0]));
        //const styleUri = stylePathOnDisk.with({ scheme: 'vscode-resource' });
        const styleUri = this._panel.webview.asWebviewUri(stylePathOnDisk);
        console.log(`scriptUri ${scriptUri}`);
        console.log(`styleUri ${styleUri}`);
        //Added for UI Changes - ends
        //Commented for UI Changes - starts
        /*
        // Local path to main script run in the webview
        const scriptPathOnDisk = vscode.Uri.file(
            path.join(this._extensionPath, 'media', 'main.js')
        );

        // And the uri we use to load this script in the webview
        const scriptUri = scriptPathOnDisk.with({ scheme: 'vscode-resource' });
        */
        //Commented for UI Changes - ends
        // Use a nonce to whitelist which scripts can be run
        const nonce = getNonce();
        // Base CSP directive
        const cspSource = this._panel.webview.cspSource;
        // Define the allowed resources path
        const resourcePathUri = this._panel.webview.asWebviewUri(vscode.Uri.file(path.join(this._extensionPath, '')));
        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">

                <!--
                Use a content security policy to only allow loading images from https or from our extension directory,
                and only allow scripts that have a specific nonce.
                -->
                <!--<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src vscode-resource: https:; script-src 'nonce-${nonce}';">-->
				<!--Commented for UI Changes -->
				<!--
				<meta
				http-equiv="Content-Security-Policy"
				content="default-src 'none'; img-src 'vscode-resource:' https:; script-src 'vscode-resource:' https:; style-src 'vscode-resource:' https:;"
			  	/>
			   	-->
			 	<!-- Added for UI Changes--> 
			  	<meta http-equiv="Content-Security-Policy" content="default-src; 
			  connect-src vscode-resource: https: ${cspSource};
			  img-src vscode-resource: https: ${cspSource} ${resourcePathUri}; style-src 'unsafe-inline' vscode-resource: https: ${cspSource}; 
			  script-src 'self' 'unsafe-inline' 'unsafe-eval' vscode-resource: https: ${cspSource}">

				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/jstree/3.2.1/themes/default/style.min.css" />
				
				<title>Add Components</title>
				<link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,700&display=swap" />
    			<link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons" />
				<link rel="stylesheet" type="text/css" href="${styleUri}"><!--Added for Ui Changes -->
            	</head>
						<body>
					<!-- Commented for UI Changes - starts -->
					<!--	<table border="0" width="100%">
						<tr>
						<td><h3>Choose Metadata Components for Package.xml</h3></td>
						<td>
						<button id="buildBtn">Update Package.xml</button>&nbsp;
						<button id="copyBtn">Copy to Clipboard</button>&nbsp;
						<button id="selectAllBtn">Select All</button>&nbsp;
						<button id="clearAllBtn">Clear All</button>
						</td>
						</tr>
						</table>
						<hr>
				<div id="jstree">
				
			  </div> 

			  <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js"></script>
			  <script src="https://cdnjs.cloudflare.com/ajax/libs/jstree/3.2.1/jstree.min.js"></script>
			  -->

			  <!-- Commented for UI Changes - ends -->
			  <!-- Added for UI Changes - starts -->
			  <noscript>You need to enable JavaScript to run this app.</noscript>
			  <div id="root"></div>
			  <script>
			  window.acquireVsCodeApi = acquireVsCodeApi;
			  </script>
			  <script  src="${scriptUri}"></script>
			  <script  src="${runtimeScriptUri}"></script>
			  <script  src="${staticScriptUri}"></script>
			  <!-- Added for UI Changes - ends -->
            </body>
            </html>`;
    }
}
function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
//# sourceMappingURL=extension.js.map