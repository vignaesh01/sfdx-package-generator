import React,{useState,useContext} from 'react';
import { GlobalContext } from "../App";
import { makeStyles } from '@material-ui/core/styles';
import Card from '@material-ui/core/Card';
import CardHeader from '@material-ui/core/CardHeader';
import CardContent from '@material-ui/core/CardContent';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import InputAdornment from '@material-ui/core/InputAdornment';
import SearchIcon from '@material-ui/icons/Search';
import Checkbox from '@material-ui/core/Checkbox';
import FormGroup from '@material-ui/core/FormGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Paper from '@material-ui/core/Paper';//Added for #35

const useStyles = makeStyles({
  root: {
    minWidth: 275,
  },
  title: {
    fontSize: 10,
  },
  pos: {
    marginBottom: 12,
  }
});

export default function ComponentList({selectedMetadataType,isShowChildren}) {
  const classes = useStyles();
  const { dispatch }= useContext(GlobalContext);
  const [filterKey,setFilterKey] = useState("");

  const handleComponentClick = (component,evt)=>{
    console.log("handleComponentClick invoked ComponentList.js");
    const isChecked=evt.target.checked;
    const compId=component.id;
    selectedMetadataType.children=selectedMetadataType.children.map(child=>{
      if(compId===child.id){
        child.isSelected=isChecked;//update the child state
      }
      return child;
    });

    selectedMetadataType=updateMetadataType(selectedMetadataType);
    dispatch({type: "COMPONENT_CHECKBOX_STATE_CHANGE" , payload : selectedMetadataType});
    
  };

  const updateMetadataType = (selectedMetadataType)=>{
    console.log("updateMetadataType invoked ComponentList.js");

    const selectedChildrenArr=selectedMetadataType.children.filter(child=>child.isSelected);
    if(selectedChildrenArr.length===0){
      //None of the children is selected
      selectedMetadataType.isSelected=false;
      selectedMetadataType.isIndeterminate=false;
    }else if(selectedChildrenArr.length===selectedMetadataType.children.length){
      //ALl the children are selected
      selectedMetadataType.isSelected=true;
      selectedMetadataType.isIndeterminate=false;
    }else{
      //Some the children are selected
      selectedMetadataType.isSelected=false;
      selectedMetadataType.isIndeterminate=true;
    }

    return selectedMetadataType;

  };

  const handleSelectAll = ()=>{
    selectedMetadataType.children=selectedMetadataType.children.map(child=>{
      child.isSelected=true;//update the child state 
      return child;
    });

    //ALl the children are selected
    selectedMetadataType.isSelected=true;
    selectedMetadataType.isIndeterminate=false;
    dispatch({type: "COMPONENT_CHECKBOX_STATE_CHANGE" , payload : selectedMetadataType});
  };

  const handleClearAll = ()=>{
    selectedMetadataType.children=selectedMetadataType.children.map(child=>{
      child.isSelected=false;//update the child state
      return child;
    });

    //None of the children are selected
    selectedMetadataType.isSelected=false;
    selectedMetadataType.isIndeterminate=false;
    dispatch({type: "COMPONENT_CHECKBOX_STATE_CHANGE" , payload : selectedMetadataType});
  };

  const handleFilterKeyChange=(event)=>{
    let fKey=event.target.value;
    fKey=fKey?fKey:'';
    setFilterKey(fKey);
  }

  return (
    <Card className={classes.root} variant="outlined">
		<CardHeader
      titleTypographyProps={{variant:'h6' }}
			title={selectedMetadataType.text!==''?selectedMetadataType.text:'Available Components'}
      action={
        <React.Fragment>
        <Button onClick={handleSelectAll}>Select All</Button>
        <Button onClick={handleClearAll}>Clear All</Button>
        </React.Fragment>
      }
      
      />
      <CardContent>
      <TextField
      id="input-with-icon-textfield"
      variant="outlined"
      placeholder={selectedMetadataType.text!==''?'Filter '+selectedMetadataType.text+'..':'Filter Components..'}
      value={filterKey}
      onChange={handleFilterKeyChange}
      size="small"
      InputProps={{
      startAdornment: (
        <InputAdornment position="start">
        <SearchIcon />
        </InputAdornment>
      ),
      }}
      fullWidth
      />
      {/*Added for #35*/}
      <Paper style={{maxHeight: 500, overflow: 'auto'}}>
      <FormGroup>
        {
            selectedMetadataType.children.map(child=>{
             
              if(child.text.toUpperCase().includes(filterKey.toUpperCase())){
             
                return (
                  <FormControlLabel
                    control={<Checkbox value={child.id} checked={child.isSelected}
                    onClick={evt=>handleComponentClick(child,evt)}/>}
                    label={child.text}/>
                )

              }else{
                return <></>;
              }

            })

        }
        
      </FormGroup>
      </Paper>
      {/*Added for #35*/}
      </CardContent>
    </Card>
  );
}

