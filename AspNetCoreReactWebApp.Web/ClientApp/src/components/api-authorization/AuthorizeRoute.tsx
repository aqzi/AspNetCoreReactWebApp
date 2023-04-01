import React, { ReactElement, useState } from 'react'
import { Route, Redirect } from 'react-router-dom'
import { ApplicationPaths, QueryParameterNames } from './ApiAuthorizationConstants'
import authService from './AuthorizeService'
import { useEffect } from 'react';

const Authorize = ({path, component, type = 'route'}: {path?: string, component: ReactElement, type?: 'route' | 'component'}) => {
    const [ready, setReady] = useState<boolean>(false);
    const [authenticated, setAuthenticated] = useState<boolean>(false);

    useEffect(() => {
        const subscription = authService.subscribe(() => authenticationChanged());
        populateAuthenticationState();

        return () => authService.unsubscribe(subscription);

    }, []);

    const populateAuthenticationState = async () => {
        setAuthenticated(await authService.isAuthenticated());
        setReady(true);
    }

    const authenticationChanged = async () => {
        setAuthenticated(false);
        setReady(false);

        await populateAuthenticationState();
    }

    function getRedirectUrl(){
        const link = document.createElement("a");
        link.href = path ? path : '/';
        const returnUrl = `${link.protocol}//${link.host}${link.pathname}${link.search}${link.hash}`;
        return `${ApplicationPaths.Login}?${QueryParameterNames.ReturnUrl}=${encodeURIComponent(returnUrl)}`
    }

    const AuthorizeRoute = () => {
        return !ready ? <div/> : <Route path={path} render={() => authenticated ? <>{component}</> : <Redirect to={getRedirectUrl()}/>}/>
    }

    const AuthorizeComponent = () => {
        return !ready ? <div/> : (authenticated ? <>{component}</> : null)
    }

    return type === 'route' ? <AuthorizeRoute/> : <AuthorizeComponent/>
}

export default Authorize;