// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.
const vscode = acquireVsCodeApi();

//const oldState = vscode.getState();
var process = true;
//const counter = document.getElementById('lines-of-code-counter');
//console.log(oldState);
//let currentCount = (oldState && oldState.count) || 0;
//counter.textContent = currentCount;

/*setInterval(() => {
    counter.textContent = currentCount++;

    // Update state
    vscode.setState({ count: currentCount });

    // Alert the extension when the cat introduces a bug
    if (Math.random() < Math.min(0.001 * currentCount, 0.05)) {
        // Send a message back to the extension
        vscode.postMessage({
            command: 'alert',
            text: '🐛  on line ' + currentCount
        });
    }
}, 100);*/

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
            let jsTreeData=[];
            for(let i=0;i<metadataObjects.length;i++){
                jsTreeData.push({ "id" : metadataObjects[i].xmlName, "text" : metadataObjects[i].xmlName, 
                children : [{ "text" : "loading.."}], inFolder : metadataObjects[i].inFolder ,isParent  : true
                 , a_attr : {href : "javaScript:void(0);"}}
               );
            }
            $('#jstree').jstree(true).settings.core.data = jsTreeData;
            process=false;
            $('#jstree').jstree(true).refresh();
           
            break;
        
        case 'listmetadata':
            console.log('Inside listmetadata');
            let results=message.results;
            let metadataType=message.metadataType;
            
            let childrenArr=[];
            
            if(!results || results.length==0){
                console.log('No children');
                childrenArr=[];
               /* var children = $("#jstree").jstree(true).get_node(metadataType).children;
                $("#jstree").jstree(true).delete_node(children);
                process=false;
                $('#jstree').jstree(true).refresh();
                break;*/
            }else if( !Array.isArray(results)){
                console.log("listmetadata results.fullName "+results.fullName);
                childrenArr.push({ "id" : metadataType+'.'+results.fullName, "text" : results.fullName})
            }else{
                for(let i=0;i<results.length;i++){
                    let node=results[i];
                    console.log("listmetadata node.fullName "+node.fullName);
                    childrenArr.push({ "id" : metadataType+'.'+node.fullName, "text" : node.fullName,a_attr : {href : "javaScript:void(0);"}});
                    //createNode('#'+metadataType,node.fullName,node.fullName,'last');
                }
            }
            
            
           
           //let jsTreeData= ;
            //console.log("jsTreeData "+JSON.stringify($('#jstree').jstree(true).settings.core.data));
            let tData =$('#jstree').jstree(true).settings.core.data;
            
            for(let i=0;i<tData.length;i++){
                if( metadataType== tData[i].id){
                    tData[i].children=childrenArr;
                   
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

function createNode(parent_node, new_node_id, new_node_text, position) {
    console.log('Inside createNode '+parent_node+' : '+new_node_id);
    $('#jstree').jstree('create_node', $(parent_node), { "text":new_node_text, "id":new_node_id }, position, false, false);	
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
            "keep_selected_style" : false,
            /*"cascade" : "up+down",
            "cascade_to_hidden" : true
            "three_state" : false,
            "whole_node" : false,  // to avoid checking the box just clicking the node 
            "tie_selection" : true*/
          },
          "plugins" : [ "checkbox","sort" ] 
    });


    
// 7 bind to events triggered on the tree
/*$('#jstree').on("changed.jstree", function (e, data) {
    if(process){
    console.log(data.selected);
    if(process && data.node.parent=='#'){
        console.log("changed : " + JSON.stringify(data.node)); 
        console.log($('#'+data.node.children[0]));
        if(data.node.children ){
          vscode.postMessage({
                command: 'fetchChildren',
                metadataType : data.node
            });
        }
       
      }
    }
  });*//*&& $('#'+data.node.children[0]).text()=="loading.."*/

  $("#jstree").on("open_node.jstree", function (e, data) {
      if(process){
        console.log("Open node_id: " + JSON.stringify(data.node)); 

        if(data.node.children && $('#'+data.node.children[0]).text()=="loading.."){
            vscode.postMessage({
                command: 'fetchChildren',
                metadataType : data.node
            });
        }
       
      }
      
     });
   
     
    $('#jstree').on('refresh.jstree', function () { process = true; });
 
$('#jstree').on("select_node.jstree", function(e, data) {
    //alert(data.node.id + ' ' + data.node.text +
     //     (data.node.state.checked ? ' CHECKED': ' NOT CHECKED'))
//only for parent nodes
          if(process && data.node.parent=='#'){
            console.log("select_node: " + JSON.stringify(data.node)); 
            //let children = $("#jstree").jstree("get_children_dom",data.node);
            //if(children && children.length==1 && children[0].original.message=="loading"){

            if(data.node.children && data.node.children.length==1){
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

  $('#clearAllBtn').on('click', function () {
      console.log('Clear All invoked');
      $('#jstree').jstree(true).settings.core.data = [];
      process=false;
      $('#jstree').jstree(true).refresh();
     vscode.postMessage({
        command: 'getMetadataTypes'
    });
  
  });

});

 