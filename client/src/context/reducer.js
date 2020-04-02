export const reducer = (state, action) => {
	switch (action.type) {
	  	case "INIT_LOAD_REQUEST":
			return processInitialRequest(state);
	
		case "INIT_LOAD_RESPONSE":
			return processInitialResponse(state, action);

        case "MDATA_TYPE_CHECKBOX_STATE_CHANGE":
            return processMetadataTypeCheckBox(state,action);
        
        case "MDATA_TYPE_CLICK":
            return processMetadataTypeClick(state,action);

        case "FETCH_CHILDREN_RESPONSE":
            return processFetchChildrenResponse(state,action);

        case "COMPONENT_CHECKBOX_STATE_CHANGE":
            return processComponentCheckBox(state,action);

        case "MDATA_TYPE_SELECT_ALL":
            return processMetadataSelectAll(state,action);

        case "MDATA_TYPE_CLEAR_ALL":
            return processMetadataClearAll(state,action);

        case "UPDATE_PACKAGE_XML":
            return processUpdatePackageXml(state,action);
        
        case "COPY_TO_CLIPBOARD":
            return processCopyToClipboard(state,action);
        
        case "HOW_TO":
            return processHowTo(state,action);

		default:
			return state;
	}
  };
  
 const processInitialRequest= (state)=>{
	state.vscode.postMessage({
        command: 'INIT_LOAD_REQUEST'
	  });
	return state;
 }; 

 const processInitialResponse = (state, action)=>{
    console.log('processInitialResponse invoked');
    let metadataTypes=[]; 
	const payload=action.payload;
	let metadataObjects=payload.metadataObjects;
	const mpExistingPackageXML=payload.mpExistingPackageXML;
    metadataObjects=processChildXMLNames(metadataObjects);
    
    metadataObjects.sort((obj1,obj2)=>{
        if (obj1.xmlName > obj2.xmlName) return 1; // if the first value is greater than the second
        if (obj1.xmlName === obj2.xmlName) return 0; // if values are equal
        if (obj1.xmlName < obj2.xmlName) return -1; // if the first value is less than the second
        
    });

    metadataObjects.forEach(metadataObj =>{
        let xmlName=metadataObj.xmlName;
        let isChildXMLName=(metadataObj.isChildXMLName)?metadataObj.isChildXMLName:false;//Added for #18

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
                    //childArr.push({"id" : xmlName+'.'+"loading", "text" : LOADING, isSelected:false});
                    continue;//change to break
                }

                let child={
                    "id" : xmlName+'.'+childName,
                    "text" : childName,
                    isSelected  : true  // is the node selected
                };

                childArr.push(child);
            }
                //Modified for #18
                parNode={
                    "id" : xmlName,
                    "text" : xmlName, 
                    children : childArr,
                    inFolder : metadataObj.inFolder ,
                    isChildXMLName:isChildXMLName,
                    isRefreshedFromServer : false,
                    isParent  : true, 
                    isSelected  : isWildChar,// is the parent node selected
                    isIndeterminate : !isWildChar
                }  

                metadataTypes.push(parNode);
        }else{
             //Modified for #18
             metadataTypes.push({ 
                "id" : xmlName,
                "text" : xmlName,
                isRefreshedFromServer : false,
                isChildXMLName:isChildXMLName,
                children : [],
                inFolder : metadataObj.inFolder,
                isParent  : true,
                isSelected  : false,// is the parent node selected
                isIndeterminate : false
             }
            );
        }
    });

    console.log(metadataTypes);
    return {...state, metadataTypes};

 };

 const processChildXMLNames= (metadataObjects)=>{
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
};

const processMetadataTypeCheckBox= (state,action)=>{
    console.log('processMetadataTypeCheckBox invoked');
    const metadataType=action.payload;
    console.log(metadataType);
    const vscode=state.vscode;
    state=updateMetadataType(state,metadataType);
    const selectedMetadataType=metadataType;
    //update checked state for all its children
    let updatedChildren=metadataType.children.map(child=>{
        child.isSelected=metadataType.isSelected;
        return child;
    });
    metadataType.children=updatedChildren;

    if(!metadataType.isRefreshedFromServer){
        vscode.postMessage({
            command: 'FETCH_CHILDREN_REQUEST',
            metadataType : metadataType
          });
    }

    state.selectedMetadataType=selectedMetadataType;

    return {...state};
};

const processMetadataTypeClick= (state,action)=>{
    console.log('processMetadataTypeClick invoked');
    const metadataType=action.payload;
    console.log(metadataType);
    const vscode=state.vscode;
    state=updateMetadataType(state,metadataType);
    const selectedMetadataType=metadataType;
    
    if(!metadataType.isRefreshedFromServer){
        vscode.postMessage({
            command: 'FETCH_CHILDREN_REQUEST',
            metadataType : metadataType
          });
    }

    state.selectedMetadataType=selectedMetadataType;

    return {...state};
};

const updateMetadataType = (state,metadataType)=>{
    const metadataTypes=state.metadataTypes;
    const newMetadataTypes=metadataTypes.map(mTypeItr=>{
        if(metadataType.id===mTypeItr.id){
            return metadataType;
        }

        return mTypeItr;
    });
    state.metadataTypes=newMetadataTypes;
    return state;
};

const processFetchChildrenResponse=(state,action)=>{
    console.log("processFetchChildrenResponse invoked");
    let message=action.payload;
    let results=message.results;
    let metadataTypeId=message.metadataType;

    let childrenArr=[];
    //let mpChildren=new Map();
            
    if(!results || results.length===0){
        console.log('No children');
        childrenArr=[];
        
    }else if( !Array.isArray(results)){
        console.log("listmetadata results.fullName "+results.fullName);
        childrenArr.push({ "id" : metadataTypeId+'.'+results.fullName, "text" : results.fullName})
        //mpChildren.set(metadataTypeId+'.'+results.fullName,results.fullName);
    }else{
        for(let i=0;i<results.length;i++){
            let node=results[i];
            console.log("listmetadata node.fullName "+node.fullName);
            childrenArr.push({ "id" : metadataTypeId+'.'+node.fullName, "text" : node.fullName});
            //mpChildren.set(metadataTypeId+'.'+node.fullName,node.fullName);
            
        }
    }

    childrenArr.sort((obj1,obj2)=>{
        if (obj1.text > obj2.text) return 1; // if the first value is greater than the second
        if (obj1.text === obj2.text) return 0; // if values are equal
        if (obj1.text < obj2.text) return -1; // if the first value is less than the second
    });

    const newMetadataTypes=state.metadataTypes.map(mTypeItr=>{
        if(metadataTypeId===mTypeItr.id){
            let isParMetadataSelected=mTypeItr.isSelected;
            mTypeItr.isRefreshedFromServer=true;//Server fetch done
            let oldChildArr = mTypeItr.children;//old children
            let selChildCount=0;
            mTypeItr.children=childrenArr.map(child=>{
                //update the children
                if(isParMetadataSelected){
                    //if parent is selected, child is automatically selected
                    child.isSelected=true;
                }else{
                    //if old child is selected, new child is also selected
                    let oldChild = oldChildArr.find(item=>{
                        return item.id===child.id;
                    });
    
                    if(oldChild){
                        //transfer all the existing properties to new child
                        child.isSelected= oldChild.isSelected;
                        if(child.isSelected){
                            selChildCount++;
                        }
                    }else{
                        //old child doesnot exist, unselected by default
                        child.isSelected=false;
                    }
                }
                
                return child;

            });
            
            if(childrenArr.length!==0 && selChildCount===childrenArr.length){
                mTypeItr.isSelected=true;
                mTypeItr.isIndeterminate=false;
            }

            state.selectedMetadataType=mTypeItr;//update selectedMetadataType
        }
        
        return mTypeItr;
    });

    state.metadataTypes=newMetadataTypes;
    console.log(newMetadataTypes);
    return {...state};

};

const processComponentCheckBox=(state,action)=>{
    console.log("processComponentCheckBox invoked");
    const selectedMetadataType=action.payload;
    console.log(selectedMetadataType);
    state.selectedMetadataType=selectedMetadataType;
    return {...state};
};

const processMetadataSelectAll=(state,action)=>{
    console.log('processMetadataSelectAll invoked');
    const payload=action.payload;
    const vscode=state.vscode;
    state.metadataTypes=payload.metadataTypes;
    vscode.postMessage({
        command: 'selectAll',
        selectedMetadata : payload.parNodeArr,
        skippedMetadataTypes : payload.skippedMetadataTypes//Added for #18
    });
    console.log(state.metadataTypes);
    return {...state};

};

const processMetadataClearAll=(state,action)=>{
    console.log('processMetadataClearAll invoked');
    //reset selectedMetadataType 
    state.selectedMetadataType={id:'',children:[]};

    //reset metadataTypes & its children
    state.metadataTypes=state.metadataTypes.map(metadataType=>{
        metadataType.isRefreshedFromServer= false;
        metadataType.children = [];
        metadataType.isSelected = false;
        metadataType.isIndeterminate=false;
        return metadataType;
    });

    console.log(state.metadataTypes);
    return {...state};
};

const processUpdatePackageXml=(state,action)=>{
    const vscode=state.vscode;
    vscode.postMessage({
        command: 'UPDATE_PACKAGE_XML',
        metadataTypes : state.metadataTypes
    });

    return state;
};

const processCopyToClipboard=(state,action)=>{
    const vscode=state.vscode;
    vscode.postMessage({
        command: 'COPY_TO_CLIPBOARD',
        metadataTypes : state.metadataTypes
    });

    return state;
};

const processHowTo=(state,action)=>{
    const vscode=state.vscode;
    vscode.postMessage({
        command: 'OPEN_URL',
        url : 'http://www.google.com'
    });

    return state;
};