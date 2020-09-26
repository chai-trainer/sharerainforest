import * as React from 'react';
import { TextField } from 'office-ui-fabric-react/lib/TextField';
import { DefaultButton } from 'office-ui-fabric-react/lib/Button';
import { Spinner } from 'office-ui-fabric-react/lib/Spinner';
import { Label } from 'office-ui-fabric-react/lib/Label';
import './App.css';
import EvergreenDetails from './EvergreenDetails';
import * as SDK from "azure-devops-extension-sdk";
import { getAccessToken } from "azure-devops-extension-sdk";
// import HowTheToolWorks from './HowTheToolWorks';
import { DetailsList } from "office-ui-fabric-react/lib/DetailsList";
import { CommonServiceIds, IHostPageLayoutService } from 'azure-devops-extension-api/Common/CommonServices';
let base64 = require('base-64');

interface IAppState {
  visible: boolean;
  showSpinner: boolean | undefined;
  siteContents: string;
}

const getTextFieldStyles = {
  root: {
    width: '584px',
    // border: '1px solid #dfe1e5',
    // borderRadius: '24px',
    height: '46px',
    marginBottom: '30px',
    font: '36px arial,sans-serif'
  },
}

const getButtonStyles = {
  root: [{
    width: '20px',
    marginTop: '20px',
    backgroundColor: '#f2f2f2',
    color: '#5F6368',
    borderRadius: '4px',
    fontFamily: 'arial,sans-serif',
    fontSize: '14px',
    selectors: {
      ':hover': {
        boxShadow: '0 1px 1px rgba(0,0,0,0.1)',
        backgroundColor: '#f8f8f8',
        border: '1px solid #c6c6c6',
        color: '#222'
      }
    }
  }]
}

class App extends React.Component<{}, IAppState> {
  private headers: Headers;
  constructor(props: any) {
    super(props);

    this.headers = this.getHeaders();

    this.state = {
      visible: false,
      showSpinner: undefined,
      siteContents: ''
    }
    console.log('before sdk ');
    SDK.init();
    this.getToken();
    SDK.register("DevOps.HostControl",function(){

    });
    console.log('lafter sdk ');
  }
  getToken = async (): Promise<void> => {
    console.log('getToken start');
    //const dialogService = await SDK.getService<IHostPageLayoutService>(CommonServiceIds.HostPageLayoutService);
    
  };



  public componentDidMount() {
    const input = document.getElementById('textField') as any;
    if (input) {
      input.focus();
      // input.setSelectionRange(5, 10);
    }
  }

  public render() {
    return (
      <div className="outerDiv">
        {
          <div className="poormanslogo">
            <div className="rainforest">Rainforest</div>
            <div className="questionmark">?</div>
          </div>
        }

        <div className="textFieldStyles"><TextField onKeyDownCapture={this.onKeyDownEvent} id="textField" borderless={true} styles={getTextFieldStyles} onFocus={this.resetVisibiliy} onKeyDown={this.resetVisibiliy} placeholder={'Enter alias or comma separated aliases'} /></div>
        <DefaultButton styles={getButtonStyles} text="Check" onClick={this.buttonClicked} />
        
        {
          this.state.showSpinner && (
            <div id="spinnerdiv" style={{marginTop: '10px'}}>
              <Spinner label="Finding evergreen status..." />
            </div>
          )
        }

        {
          this.state.showSpinner === false && (
            <div>
              {this.state.siteContents}
            </div> 
          )
        }

        <div className="footer">
          <div onClick={this.howTheToolWorks}>How the tool works</div>
        </div>
      </div>
    )
  }

  private onKeyDownEvent = (event: any) => {
    if(event.keyCode === 13) {
      this.buttonClicked();
    }
  }

  private buttonClicked = async () => {
    this.setState({
      showSpinner: true,
    })

    // Read the file contents of common-versions.json from odsp-next master
    const odspNextCommonVersionsUrl = 'https://dev.azure.com/emailaftabh/rainforesttest/_apis/git/repositories/rainforesttest/items?path=tsconfig.json&api-version=5.1';
    const fileContentsToDebug = await this.readCommonVersionsFromMaster(odspNextCommonVersionsUrl)
    console.log(fileContentsToDebug);

    this.setState({
      siteContents: JSON.stringify(fileContentsToDebug),
      showSpinner: false
    })

    console.log('last line for debug');
  }

  private async readCommonVersionsFromMaster(url: string, formatAsText?: boolean) {
    let data;
    
    if(formatAsText) {
     data = await this.getGETRequestResponse(url, formatAsText);
    } else {
      data = await this.getGETRequestResponse(url); 
    }

    return data;
  }

  private getHeaders = (): Headers => {
    let headers = new Headers();
    const user = 'user';
    console.log('before password');
    const password = SDK.getAccessToken();//'jyqx743a6zy6kd5vw4we7diexorqj6cg5gqsz557mvvw5ehkw4aa';
    console.log('password',password);
    headers.append('Authorization', 'Basic ' + base64.encode(user + ':' + password));

    return headers;
  }

  private async getGETRequestResponse(url: string, formatAsText?: boolean) {
    const response = await fetch(url, {
      method: 'GET',
      headers: this.headers
    })

    let data;
    if(formatAsText) {
      data = await response.text();
    } else {
      data = await response.json();
    }

    return data;
  }

  private resetVisibiliy = () => {
    this.setState({
      visible: false
    })
  }

  private howTheToolWorks = () => {
    // return (
    //   <HowTheToolWorks />
    // )
    return (
      <div className="howtoolworks">
        Explain how the tool works
      </div>
    )
  }
}

export default App;
