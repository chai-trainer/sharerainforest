import * as React from 'react';
import { TextField } from 'office-ui-fabric-react/lib/TextField';
import { DefaultButton } from 'office-ui-fabric-react/lib/Button';
import { Spinner } from 'office-ui-fabric-react/lib/Spinner';
import { Label } from 'office-ui-fabric-react/lib/Label';
import './App.css';
import EvergreenDetails from './EvergreenDetails'
// import HowTheToolWorks from './HowTheToolWorks';
import { DetailsList } from "office-ui-fabric-react/lib/DetailsList";
let base64 = require('base-64');

interface IAppState {
  visible: boolean;
  showSpinner: boolean | undefined;
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

const NO_CHANGEFILE_FOUND = 'No change file found in PR';

class App extends React.Component<{}, IAppState> {
  private headers: Headers;
  private items: any;
  private columns: any;
  private groups: any;

  constructor(props: any) {
    super(props);

    this.headers = this.getHeaders();
    this.items = [];
    this.columns = [
      {
        key: "column1",
        name: "Title of Pull Request on odsp-common",
        fieldName: "name",
        minWidth: 100,
        maxWidth: 800,
        isResizable: true
      },
      {
        key: "column2",
        name: "odsp-next",
        fieldName: "value",
        minWidth: 100,
        maxWidth: 200,
        isResizable: true
      },
      {
        key: "column3",
        name: "sp-client",
        fieldName: "value",
        minWidth: 100,
        maxWidth: 200,
        isResizable: true
      }
    ];
    this.groups = [];

    this.state = {
      visible: false,
      showSpinner: undefined
    }
  }

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
              <DetailsList
               checkboxVisibility={2} 
               items={this.items} 
               columns={this.columns}
               groups={this.groups}
               groupProps={{
                showEmptyGroups: true
              }}
              />
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

    this.items = [];

    this.groups = [];

    // Read the file contents of common-versions.json from odsp-next master
    const odspNextCommonVersionsUrl = 'https://dev.azure.com/onedrive/OneDriveWeb/_apis/git/repositories/odsp-next/items?path=common/config/rush/common-versions.json&api-version=5.1';
    const commonVersionsOfOdspNext = await this.readCommonVersionsFromMaster(odspNextCommonVersionsUrl)
    console.log(commonVersionsOfOdspNext);

    // Read the file contents of common-versions.json from sp-client master
    const spClientCommonVersionsUrl = 'https://dev.azure.com/onedrive/SPPPlat/_apis/git/repositories/sp-client/items?path=common/config/rush/common-versions.json&api-version=5.1';
    const commonVersionsOfSpClient = await this.readCommonVersionsFromMasterForSpClient(spClientCommonVersionsUrl, true)
    // console.log(commonVersionsOfSpClient);

    // Look at odsp-common's rush.json to get a mapping from package name to project folder
    const odspCommonRushJsonUrl = 'https://dev.azure.com/onedrive/OneDriveWeb/_apis/git/repositories/odsp-common/items?path=rush.json&api-version=5.1';
    const packageNameToProjectFolderMappingForOdspCommon = await this.getPackageNameToProjectFolderMappingForOdspCommon(odspCommonRushJsonUrl)
    console.log(packageNameToProjectFolderMappingForOdspCommon);

    // user in textfield
    let textFieldInput = (document.getElementById('textField') as any).value;
    const aliases = textFieldInput.split(",");

    // group index
    let endIndexOfGroup = 0;

    // for each alias
    for(let al=0;al<aliases.length;al++) {
      let alias = aliases[al].trim();
      if(alias.indexOf("@microsoft.com") < 0) {
        alias = alias+'@microsoft.com';
      }
  
      // find completed PRs
      const completedPRs = await this.findAllCompletedPrs(alias);

      // for DetailsList groups
      if(this.groups && al > 0 && this.groups[al-1]) {
        endIndexOfGroup += this.groups[al-1].count;
      } 

      // for each completed PR
      for(let i = 0;i<completedPRs.length;i++) {
        const prId = completedPRs[i].id;
        const prTitle = completedPRs[i].title;
        let evergreenstatusOnOdspNext;
        let evergreenstatusOnSpClient;

        // find number of iterations in PR
        let url = 'https://dev.azure.com/onedrive/OneDriveWeb/_apis/git/repositories/odsp-common/pullRequests/' + prId + '/iterations?api-version=5.1';
        const iterations = await this.findNumberOfIteraionsInPr(url);

        // find names of all files that changed in the PR
        url = 'https://dev.azure.com/onedrive/OneDriveWeb/_apis/git/repositories/odsp-common/pullRequests/' + prId + '/iterations/' + iterations + '/changes?api-version=5.1'
        const pathToChangeFile = await this.getPathToChangeFile(url);
        if (pathToChangeFile === NO_CHANGEFILE_FOUND) {
          evergreenstatusOnOdspNext = 'Unable to find Evergreen status. No change file detected in PR'
          evergreenstatusOnSpClient = 'Unable to find Evergreen status. No change file detected in PR'
        } else {
          // Get the latest commit of Pull request
          url = 'https://dev.azure.com/onedrive/OneDriveWeb/_apis/git/repositories/odsp-common/pullRequests/' + prId + '/commits?api-version=5.1'
          const latestCommit = await this.getLatestCommitIdOfPullRequest(url);

          // read file contents of change files without using branch name
          url = 'https://onedrive.visualstudio.com/OneDriveWeb/_apis/git/repositories/odsp-common/items?versionOptions=0&versionType=2&version=' + latestCommit + '&path=&scopePath=' + pathToChangeFile + '&includeContentMetadata=true&latestProcessedChange=false&download=false';
          const changeFileContents = await this.getCommentAndPackageNameFromChangeFile(url) as any;
          const comment = changeFileContents.comment;
          const packageName = changeFileContents.packageName;
          const projectFolder = this.getProjectFolderFromPackageName(packageName, packageNameToProjectFolderMappingForOdspCommon);

          // edge case - no comment detected in change file
          if (comment.length === 0) {
            evergreenstatusOnOdspNext = 'Unable to find Evergreen status. No comment detected in change file'
            evergreenstatusOnSpClient = 'Unable to find Evergreen status. No comment detected in change file'
          } else {
            // Read the file contents of packagename/CHANGELOG.json from odsp-common master, and get to find the package version
            url = 'https://dev.azure.com/onedrive/OneDriveWeb/_apis/git/repositories/odsp-common/items?path=' + projectFolder + '/CHANGELOG.json&api-version=5.1';
            const packageVersionContainingPrChange = await this.findPackageVersionContainingPrChange(url, comment);
            console.log('pr:' + 'https://dev.azure.com/onedrive/OneDriveWeb/_apis/git/repositories/odsp-common/pullRequests/' + prId + '/iterations?api-version=5.1');
            console.log('package name: ' + projectFolder);
            console.log('version containing change: ' + packageVersionContainingPrChange);
            if(packageVersionContainingPrChange === -1) {
              evergreenstatusOnOdspNext = 'Evergreen status could not be found. Change not yet in odsp-common master CHANGELOG';
              evergreenstatusOnSpClient = 'Evergreen status could not be found. Change not yet in odsp-common master CHANGELOG';
            } else {
              // evergreen logic in odsp-next
              const currentEvergreenedVersionInOdspNext = commonVersionsOfOdspNext.preferredVersions[packageName];
              console.log('currentEvergreenedVersionInOdspNext == ' + currentEvergreenedVersionInOdspNext);
              evergreenstatusOnOdspNext = (this.compareVersion(currentEvergreenedVersionInOdspNext, packageVersionContainingPrChange)) >=0 ? 'Evergreened' : 'Not Evergreened'
              console.log('evergreenstatusOnOdspNext == ' + evergreenstatusOnOdspNext);

              // evergreen logic in sp-client
              const currentEvergreenedVersionInSpClient = commonVersionsOfSpClient[packageName];
              console.log('currentEvergreenedVersionInSpClient == ' + currentEvergreenedVersionInSpClient);
              evergreenstatusOnSpClient = (this.compareVersion(currentEvergreenedVersionInSpClient, packageVersionContainingPrChange)) >=0 ? 'Evergreened' : 'Not Evergreened'
              console.log('evergreenstatusOnSpClient == ' + evergreenstatusOnSpClient);
            }
          }
        }

        this.items.push({
          key: endIndexOfGroup + i,
          name: prTitle,
          value: evergreenstatusOnOdspNext,
          spstatus: evergreenstatusOnSpClient
        })
        console.log('');
      }
      this.groups.push({
        key: "group" + al.toString(),
        name: alias,
        startIndex: endIndexOfGroup,
        count: completedPRs.length,
        level: 0
      })
    }

    this.setState({
      visible: true,
      showSpinner: false
    })
    console.log('last line for debug');
  }

  // This uses filtering to find all completed PRs raised by a specified author
  private async findAllCompletedPrs(alias: string) {
    const url = 'https://dev.azure.com/onedrive/OneDriveWeb/_apis/git/repositories/odsp-common/pullrequests?api-version=5.0&searchCriteria.status=completed&$top=500';
    const data = await this.getGETRequestResponse(url);

    var completedPRs = [];
    for(let i =0;i<data.value.length;i++) {
      let element = data.value[i];
      if (element.createdBy.uniqueName === alias) {
        completedPRs.push(
          {
            id: element.pullRequestId,
            title: element.title
          })
      }
    }

    return completedPRs;
  }

  private async findNumberOfIteraionsInPr(url: string) {
    const data = await this.getGETRequestResponse(url);
    const iterations = data.count;
    return iterations;
  }

  private async getPathToChangeFile(url: string) {
    const data = await this.getGETRequestResponse(url);
    
    for(let i =0;i<data.changeEntries.length;i++) {
      const path = data.changeEntries[i].item.path;

      if (this.isChangeFile(path)) {
        return path;
      }
    }

    return NO_CHANGEFILE_FOUND;
  }

  private async getBranchNameOfPR(url: string) {
    const data = await this.getGETRequestResponse(url);

    const branchName = data.sourceRefName;

    return branchName.substr("refs/heads/".length);
  }

  private async getCommentAndPackageNameFromChangeFile(url: string) {
    const data = await this.getGETRequestResponse(url);

    if(data === undefined || data.changes === undefined) {
      return undefined;
    }

    return {
      comment: data.changes[0].comment,
      packageName: data.packageName
    };
  }

  private async findPackageVersionContainingPrChange(url: string, comment: string) {
    const data = await this.getGETRequestResponse(url);

    const entries = data.entries; 

    if(entries) {
      for(let i =0;i<entries.length;i++) {
        const commentInEntry = JSON.stringify(entries[i].comments);
        if (commentInEntry.indexOf(comment) >= 0) {
          return entries[i].version;
        }
      }
    }
  
    return -1;
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

  private async readCommonVersionsFromMasterForSpClient(url: string, formatAsText?: boolean) {
    let data = await this.getGETRequestResponse(url, formatAsText);

    data = data.split("\n");

    let start: boolean = false;

    let mapping: any = [];
    let mappingObject: any = {}
    for(let i = 0;i<data.length;i++) {
      if(data[i] && data[i].indexOf("preferredVersions") >= 0) {
        start = true;
      }

      if(start) {
        if(data[i].indexOf(":") >= 0) {
          let packageName = data[i].split(":")[0];
          let versionNumber = data[i].split(":")[1];

          if(packageName.indexOf("\"") >= 0 && versionNumber.indexOf("\"") >= 0) {
            let packageNameBetweenQuotes = packageName.match(/"([^"]+)"/)[1];
            let versionNumberBetweenQuotes = versionNumber.match(/"([^"]+)"/)[1];

            // console.log('packageName==' + packageName + ', packageNameBetweenQuotes == ' + packageNameBetweenQuotes); 
            // console.log('versionNumber==' + versionNumber + ', versionNumberBetweenQuotes == ' + versionNumberBetweenQuotes); 
            console.log('['+packageNameBetweenQuotes+']' + "---" + '[' + versionNumberBetweenQuotes + ']');
            // let mappingObject: any = {}
            mappingObject[packageNameBetweenQuotes] = versionNumberBetweenQuotes;
            mapping.push(mappingObject)
          }
        }
        
        else if(data[i].indexOf("}") >= 0) {
          break;
        }
      }
    }

    return mappingObject;
  }

  private async getLatestCommitIdOfPullRequest(url: string) {
    const data = await this.getGETRequestResponse(url);

    return data.value[0].commitId;
  }

  private async getPackageNameToProjectFolderMappingForOdspCommon(url: string) {
    let data = await this.getGETRequestResponse(url);

    return data.projects;
  }

  // helper functions
  private isChangeFile = (filePath: string): boolean => {
    if (filePath && filePath.indexOf('changes') >= 0 && filePath.endsWith('.json')) {
      return true;
    }
    return false;
  }

  private compareVersion = (v1: any, v2: any) => {
    if (typeof v1 !== 'string') return false;
    if (typeof v2 !== 'string') return false;
    v1 = v1.split('.');
    v2 = v2.split('.');
    const k = Math.min(v1.length, v2.length);
    for (let i = 0; i < k; ++ i) {
        v1[i] = parseInt(v1[i], 10);
        v2[i] = parseInt(v2[i], 10);
        if (v1[i] > v2[i]) return 1;
        if (v1[i] < v2[i]) return -1;        
    }
    return v1.length == v2.length ? 0: (v1.length < v2.length ? -1 : 1);
}

  private getProjectFolderFromPackageName = (packageName: string, mappingObject: any) => {
    for(let i=0;i<mappingObject.length;i++) {
      if(mappingObject[i].packageName === packageName) {
        return mappingObject[i].projectFolder;
      }
    }
    return null;
  }

  private getHeaders = (): Headers => {
    let headers = new Headers();
    const user = 'user';
    const password = 'cctskmxiituv2ira24kw2tig3xhxdj7kl5i5edkz6lqptlqf53eq';
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

  private findEvergreenDetailsOnOdspNext = () => {
    console.log('inside findEvergreenDetailsOnOdspNext');
  }

  private findEvergreenDetailsOnSpClient = () => {
    console.log('inside findEvergreenDetailsOnSpClient');
  }
}

export default App;
