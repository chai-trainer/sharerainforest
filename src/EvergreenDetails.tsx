import * as React from 'react';
import './App.css';

interface IEvergreenDetailsProps
{
    repoName: string;
    evergreenStatus: string;
}

class EvergreenDetails extends React.Component<IEvergreenDetailsProps, {}> {
    public render() {
        const {repoName, evergreenStatus} = this.props;

        return (
            <div>
                <h1>{repoName}</h1>
                <h2 className={evergreenStatus}>{evergreenStatus==='evergreened'?'Evergreened': 'Not evergreened'}</h2>
            </div>
        )
    }
}

export default EvergreenDetails;