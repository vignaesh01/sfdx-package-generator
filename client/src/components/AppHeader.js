import React,{useContext} from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { GlobalContext } from "../App";
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import DescriptionIcon from '@material-ui/icons/Description';
import FileCopyIcon from '@material-ui/icons/FileCopy';
import HelpOutlineIcon from '@material-ui/icons/HelpOutline';

const useStyles = makeStyles(theme => ({
  root: {
    flexGrow: 1,
  },
  menuButton: {
    marginRight: theme.spacing(2),
  },
  button: {
    marginRight: theme.spacing(1),
  },
  title: {
    flexGrow: 1,
  },
}));

export default function AppHeader() {
  const classes = useStyles();
  const { dispatch }= useContext(GlobalContext);

  const updatePackageXML=()=>{
    dispatch({type: "UPDATE_PACKAGE_XML"});
  };

  const copyToClipboard=()=>{
    dispatch({type: "COPY_TO_CLIPBOARD"});
  };

  const handleHowTo = ()=>{
    console.log('handleHowTo invoked');
    dispatch({type: "HOW_TO"});
  };

  return (
    <div className={classes.root}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" className={classes.title}>
            Salesforce Package.xml Generator
          </Typography>
          <Button color="inherit" 
            onClick={updatePackageXML}
            variant="outlined" 
            className={classes.button}
            startIcon={<DescriptionIcon/>}>
            Update Package.xml
          </Button>
          <Button color="inherit" 
            onClick={copyToClipboard}
            variant="outlined"
            className={classes.button}
            startIcon={<FileCopyIcon/>}>
            Copy To Clipboard
          </Button>
          <Button color="inherit" 
            onClick={handleHowTo}
            variant="outlined"
            className={classes.button}
            startIcon={<HelpOutlineIcon/>}>
            How To
          </Button>
        </Toolbar>
      </AppBar>
    </div>
  );
}
