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
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import Checkbox from '@material-ui/core/Checkbox';
import IconButton from '@material-ui/core/IconButton';
import NavigateNextIcon from '@material-ui/icons/NavigateNext';
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

export default function MetadataType() {
  const classes = useStyles();
  const { globalState, dispatch }= useContext(GlobalContext);
  const [filterKey,setFilterKey] = useState("");
  
  const handleCheckboxChange = (evt,metadataType)=>{
    evt.stopPropagation();
    console.log('handleCheckboxChange invoked MetadataType.js');
    const isChecked=evt.target.checked;
    metadataType.isSelected=isChecked;
    metadataType.isIndeterminate=false;//reset indeterminate state
    console.log(metadataType);
    dispatch({type: "MDATA_TYPE_CHECKBOX_STATE_CHANGE" , payload : metadataType});
    //window.scrollTo(0, 0);Commented for #35
    
  };

 const handleMetadataClick = (evt,metadataType)=>{
    evt.stopPropagation();
    console.log('handleMetadataClick invoked MetadataType.js');
    console.log(metadataType);
    dispatch({type: "MDATA_TYPE_CLICK" , payload : metadataType});
    //window.scrollTo(0, 0);Commented for #35
  };

  const handleSelectAll =()=>{
    console.log("handleSelectAll MetadataType.js");
    let parNodeArr=[];
    let skippedMetadataTypes=[];   

    const metadataTypes=globalState.metadataTypes.map(metadataType => {
      
    if(!metadataType.inFolder && !metadataType.isChildXMLName){
      parNodeArr.push(metadataType.id);
      metadataType.isSelected=true;
      metadataType.isIndeterminate=false;//reset indeterminate state
    }else{
      skippedMetadataTypes.push(metadataType.id);
    }

      return metadataType;
    });
      //Added for #18 - starts
    if(skippedMetadataTypes && skippedMetadataTypes.length>0){
      console.log("skippedMetadataTypes");
      console.log(skippedMetadataTypes);
      skippedMetadataTypes.sort();
      //alert("The following Metadata Types will be skipped "+skippedMetadataTypes.join());
    }
    //Added for #18 - ends
    parNodeArr.sort();

    dispatch({type: "MDATA_TYPE_SELECT_ALL" , payload : {metadataTypes,parNodeArr,skippedMetadataTypes}});
  };

  const handleClearAll=()=>{
    console.log("handleClearAll MetadataType.js");
    dispatch({type: "MDATA_TYPE_CLEAR_ALL" });
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
			title="Metadata Types"
      action={
        <React.Fragment>
        <Button color="secondary" onClick={handleSelectAll}><strong>Select All</strong></Button>
        <Button onClick={handleClearAll}>Clear All</Button>
        </React.Fragment>
      }
      
      />
      <CardContent>
        <TextField
        id="input-with-icon-textfield"
        variant="outlined"
        placeholder="Filter Metadata Types.."
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
        <List dense component="nav" aria-label="Metadata Types">
        {globalState.metadataTypes.map(metadataType =>{

          if(metadataType.id.toUpperCase().includes(filterKey.toUpperCase())){
            return(
              <ListItem button key={metadataType.id} onClick={evt=>handleMetadataClick(evt,metadataType)}
              selected={metadataType.id===globalState.selectedMetadataType.id}
              title='Click to view available Metadata Components'>
              <ListItemIcon>
                    <Checkbox
                      edge="start"
                      tabIndex={-1}
                      disableRipple
                      inputProps={{ 'aria-labelledby': 'labelId' }}
                      checked={metadataType.isSelected}
                      indeterminate={metadataType.isIndeterminate}
                      onClick={evt=>handleCheckboxChange(evt,metadataType)}
                      
                    />
              </ListItemIcon>
              <ListItemText primary={metadataType.id}/>
              <ListItemSecondaryAction>
                  <IconButton edge="end" aria-label="comments" 
                    onClick={evt=>handleMetadataClick(evt,metadataType)}>
                    <NavigateNextIcon />
                  </IconButton>
              </ListItemSecondaryAction>
            </ListItem>  
          );
          }else{
            return <></>;
          }
          
        })
      } 
        
      </List>
      </Paper>
      {/*Added for #35*/}
      </CardContent>
    </Card>
  );
}
