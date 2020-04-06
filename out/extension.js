"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const vscode = require("vscode");
const child = require("child_process");
var fs = require("fs");
var xml2js = require('xml2js');
var clipboardy = require('clipboardy');
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
        //Modified for #18
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
        this.VERSION_NUM = '48.0';
        this.CHAR_TAB = '\t';
        this.LOADING = '*loading..';
        this.infoMsg = 'All metadata selected except ';
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
                    this.buildPackageXML(message.selectedNodes, false);
                    return;
                case 'getMetadataTypes':
                    console.log('onDidReceiveMessage getMetadataTypes');
                    this.getMetadataTypes({});
                    return;
                case 'copyToClipboard':
                    console.log('onDidReceiveMessage copyToClipboard');
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
        });
        CodingPanel.currentPanel = new CodingPanel(panel, extensionPath);
    }
    static revive(panel, extensionPath) {
        CodingPanel.currentPanel = new CodingPanel(panel, extensionPath);
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
            clipboardy.write(xmlString).then((result) => {
                console.log(result);
                vscode.window.showInformationMessage("Contents Copied to Clipboard successfully!!");
            });
        }
        else {
            let manifestPath = path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, "/manifest");
            if (!fs.existsSync(manifestPath)) {
                fs.mkdirSync(manifestPath);
            }
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
                    let sfdxCmd = "sfdx force:mdapi:listmetadata --json -m " + mType;
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
                        vscode.window.showErrorMessage(data);
                        resolve();
                    });
                    foo.stdin.on("data", (data) => {
                        console.log('stdin: ' + data);
                        //vscode.window.showErrorMessage(data);
                        resolve();
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
            let sfdxCmd = "sfdx force:mdapi:listmetadata --json -m " + folderType;
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
                        vscode.window.showErrorMessage(data);
                        resolve();
                    });
                    foo.stdin.on("data", (data) => {
                        console.log('stdin: ' + data);
                        resolve();
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
                        resolve();
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
                let sfdxCmd = "sfdx force:mdapi:listmetadata --json -m " + mType;
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
                    vscode.window.showErrorMessage(data);
                    resolve();
                });
                foo.stdin.on("data", (data) => {
                    console.log('stdin: ' + data);
                    //vscode.window.showErrorMessage(data);
                    resolve();
                });
                foo.on('exit', (code, signal) => {
                    console.log('exit code ' + code);
                    console.log('bufferOutData ' + bufferOutData);
                    let data = JSON.parse(bufferOutData);
                    let depArr = [];
                    let results = data.result;
                    this._panel.webview.postMessage({ command: 'listmetadata', results: results, metadataType: mType });
                    resolve();
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
                let sfdxCmd = "sfdx force:mdapi:listmetadata --json -m " + mType + " --folder " + folderNames[index];
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
                    vscode.window.showErrorMessage(data);
                    resolve();
                });
                foo.stdin.on("data", (data) => {
                    console.log('stdin: ' + data);
                    resolve();
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
                    resolve();
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
                var foo = child.exec('sfdx force:mdapi:describemetadata --json', {
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
                    vscode.window.showErrorMessage(data);
                    resolve();
                });
                foo.stdin.on("data", (data) => {
                    console.log('stdin: ' + data);
                    resolve();
                });
                foo.on("exit", (code, signal) => {
                    console.log("exited with code " + code);
                    console.log("bufferOutData " + bufferOutData);
                    resolve();
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
        const scriptUri = scriptPathOnDisk.with({ scheme: 'vscode-resource' });
        const runtimeScriptPathOnDisk = vscode.Uri.file(path.join(this._extensionPath, 'client', 'build', scriptEntryPoints[1]));
        const runtimeScriptUri = runtimeScriptPathOnDisk.with({ scheme: 'vscode-resource' });
        const staticScriptPathOnDisk = vscode.Uri.file(path.join(this._extensionPath, 'client', 'build', scriptEntryPoints[2]));
        const staticScriptUri = staticScriptPathOnDisk.with({ scheme: 'vscode-resource' });
        const stylePathOnDisk = vscode.Uri.file(path.join(this._extensionPath, 'client', 'build', styleEntryPoints[0]));
        const styleUri = stylePathOnDisk.with({ scheme: 'vscode-resource' });
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
				content="default-src 'none'; img-src vscode-resource: https:; script-src vscode-resource: https:; style-src vscode-resource: https:;"
			  	/>
			   	-->
			 <!-- Added for UI Changes--> 
			  <meta http-equiv="Content-Security-Policy" content="default-src *; 
			  connect-src vscode-resource: https:;
			  img-src vscode-resource: https:; style-src 'unsafe-inline' vscode-resource: https:; 
			  script-src 'self' 'unsafe-inline' 'unsafe-eval' vscode-resource: https:">

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