// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.
const vscode = acquireVsCodeApi();
var process = true;
const LOADING='*loading..';
// Handle messages sent from the extension to the webview
window.addEventListener('message', event => {
    const message = event.data; // The json data that the extension sent
    console.log(event.data);
    switch (message.command) {
        case 'refactor':
            currentCount = Math.ceil(currentCount * 0.5);
            counter.textContent = currentCount;
            break;
        case 'metadataObjects':
            console.log("Inside metadataObjects");
            let metadataObjects=message.metadataObjects;
            metadataObjects=processChildXMLNames(metadataObjects);//Added for #18
            let mpExistingPackageXML=message.mpExistingPackageXML;
            console.log(mpExistingPackageXML);
            let jsTreeData=[];
            for(let i=0;i<metadataObjects.length;i++){
                let xmlName=metadataObjects[i].xmlName;
                let isChildXMLName=(metadataObjects[i].isChildXMLName)?metadataObjects[i].isChildXMLName:false;//Added for #18
                if(mpExistingPackageXML[xmlName]){
                    //metadata already selected in existing package.xml
                    let members=mpExistingPackageXML[xmlName];
                    let childArr=[];
                    let isWildChar=false;
                    let parNode={};
                    for(let c=0;c<members.length;c++){
                        let childName=members[c];
                        
                        if(childName==='*'){
                            isWildChar=true;
                            childArr.push({"id" : xmlName+'.'+"loading", "text" : LOADING});
                            continue;
                        }

                        let child={ "id" : xmlName+'.'+childName,
                         "text" : childName,
                          state : {
                            selected  : (childName!=LOADING)?true:false  // is the node selected
                          },
                          a_attr : {href : "javaScript:void(0);"}};

                          childArr.push(child);
                          
                    }
                   //Modified for #18
                    parNode={ "id" : xmlName, "text" : xmlName, 
                    children : childArr, inFolder : metadataObjects[i].inFolder ,
                    isChildXMLName:isChildXMLName,
                    isRefreshedFromServer : false,
                    isParent  : true, state : {
                      selected  : isWildChar  // is the parent node selected
                    },
                  a_attr : {href : "javaScript:void(0);"}};
                    jsTreeData.push(parNode);

                }else{
                    //Modified for #18
                    jsTreeData.push({ "id" : metadataObjects[i].xmlName, "text" : metadataObjects[i].xmlName, 
                    isRefreshedFromServer : false,isChildXMLName:isChildXMLName,
                    children : [{ "id" : xmlName+'.'+"loading", "text" : LOADING}], inFolder : metadataObjects[i].inFolder ,isParent  : true
                     , a_attr : {href : "javaScript:void(0);"}}
                   );
                }
     
            }
            $('#jstree').jstree(true).settings.core.data = jsTreeData;
            console.log(jsTreeData);
            process=false;
            $('#jstree').jstree(true).refresh();
            $("#jstree").jstree(true).load_node('#');
            
            break;
        
        case 'listmetadata':
            console.log('Inside listmetadata');
            let results=message.results;
            let metadataType=message.metadataType;
            
            let childrenArr=[];
            
            if(!results || results.length==0){
                console.log('No children');
                childrenArr=[];
              
            }else if( !Array.isArray(results)){
                console.log("listmetadata results.fullName "+results.fullName);
                childrenArr.push({ "id" : metadataType+'.'+results.fullName, "text" : results.fullName,a_attr : {href : "javaScript:void(0);"}})
            }else{
                for(let i=0;i<results.length;i++){
                    let node=results[i];
                    console.log("listmetadata node.fullName "+node.fullName);
                    childrenArr.push({ "id" : metadataType+'.'+node.fullName, "text" : node.fullName,a_attr : {href : "javaScript:void(0);"}});
                   
                }
            }
            
            
           
           //let jsTreeData= ;
            //console.log("jsTreeData "+JSON.stringify($('#jstree').jstree(true).settings.core.data));
            let tData =$('#jstree').jstree(true).settings.core.data;
            
            for(let i=0;i<tData.length;i++){
                if( metadataType== tData[i].id){
                    tData[i].children=childrenArr;
                    tData[i].isRefreshedFromServer=true;
                    break;
                }
            }

            $('#jstree').jstree(true).settings.core.data = tData;
            process=false;
            $('#jstree').jstree(true).refresh();
            
            //$('#jstree').jstree(true).check_node(metadataType); 
           
            
            break;

    }
});

//Added for #18
function processChildXMLNames(metadataObjects){
    let combinedArr=[];
    for(let i=0;i<metadataObjects.length;i++){
        combinedArr.push(metadataObjects[i]);

        if(metadataObjects[i].childXmlNames){
            metadataObjects[i].childXmlNames.forEach(childXmlName => {
                let childObj={};
                childObj.xmlName=childXmlName;
                childObj.inFolder=false;
                childObj.isChildXMLName=true;
                combinedArr.push(childObj);
            });

        }
    }

    return combinedArr;
}

$(function () {

  


     // 6 create an instance when the DOM is ready
     $('#jstree').jstree({
          'core' : {
            "themes" : {
                "variant" : "large"
              }
        },
        "checkbox" : {
            "keep_selected_style" : false

          },
          "plugins" : [ "checkbox","sort" ] 
    });


    

  $("#jstree").on("open_node.jstree", function (e, data) {
      if(process){
        console.log("Open node_id: " + JSON.stringify(data.node)); 
        let parentNode=data.node;
    
        //if(data.node.children && $('#'+data.node.children[0]).text()=="loading.."){
         if(parentNode && parentNode.parent==='#' && !parentNode.original.isRefreshedFromServer){ 
            vscode.postMessage({
                command: 'fetchChildren',
                metadataType : data.node
            });
        }
       
      }
      
     });
   
     
    $('#jstree').on('refresh.jstree', function () { process = true; });
 
$('#jstree').on("select_node.jstree", function(e, data) {

//only for parent nodes
            let parentNode=data.node;
         // if(process && data.node.parent=='#'){
            if(process){
            console.log("select_node: " + JSON.stringify(data.node)); 

            //if(data.node.children && data.node.children.length==1){
            if(parentNode && parentNode.parent==='#' && !parentNode.original.isRefreshedFromServer) { 
                vscode.postMessage({
                    command: 'fetchChildren',
                    metadataType : data.node
                });
            }
           
          }
  });

  // 8 interact with the tree - either way is OK
  $('#buildBtn').on('click', function () {
    var selectedNodes= $('#jstree').jstree(true).get_selected(true)
     console.log(JSON.stringify(selectedNodes));
     vscode.postMessage({
        command: 'buildPackageXML',
        selectedNodes : selectedNodes
    });
   
  });

  
  $('#copyBtn').on('click', function () {
    var selectedNodes= $('#jstree').jstree(true).get_selected(true)
     console.log(JSON.stringify(selectedNodes));
     vscode.postMessage({
        command: 'copyToClipboard',
        selectedNodes : selectedNodes
    });
   
  });


  $('#clearAllBtn').on('click', function () {
      console.log('Clear All invoked');
      $('#jstree').jstree(true).settings.core.data = [];
      process=false;
      $('#jstree').jstree(true).refresh();
     vscode.postMessage({
        command: 'getMetadataTypes'
    });
  
  });

  $('#selectAllBtn').on('click', function () {
    console.log('Select All invoked');
    
    let tData =$('#jstree').jstree(true).settings.core.data;
    let parNodeArr=[];
    let skippedMetadataTypes=[];        
    for(let i=0;i<tData.length;i++){
        if(!tData[i].inFolder && !tData[i].isChildXMLName){//Modified for #18
            parNodeArr.push(tData[i].id);
        }else{
            skippedMetadataTypes.push(tData[i].id);
        }
        
    }

    //Added for #18 - starts
    if(skippedMetadataTypes && skippedMetadataTypes.length>0){
        console.log("skippedMetadataTypes");
        console.log(skippedMetadataTypes);
        skippedMetadataTypes.sort();
        //alert("The following Metadata Types will be skipped "+skippedMetadataTypes.join());
    }
    //Added for #18 - ends
    parNodeArr.sort();
    vscode.postMessage({
        command: 'selectAll',
        selectedMetadata : parNodeArr,
        skippedMetadataTypes : skippedMetadataTypes//Added for #18
    });

    process=false;
    $('#jstree').jstree('select_node', parNodeArr,true,true);
    process=true;

});

});

 