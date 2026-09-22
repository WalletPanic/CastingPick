import React from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import './styles.css';
class ErrorBoundary extends React.Component {
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true}}
 render(){return this.state.failed?<main className="page empty"><h1>화면을 불러오지 못했어요</h1><p>페이지를 새로고침해 다시 시도해주세요.</p><button className="primary" onClick={()=>location.reload()}>새로고침</button></main>:this.props.children}
}
createRoot(document.getElementById('root')).render(<React.StrictMode><ErrorBoundary><App/></ErrorBoundary></React.StrictMode>);
