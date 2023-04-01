import React, { useEffect, useState } from 'react'
import authService from './AuthorizeService';
import { AuthenticationResultStatus } from './AuthorizeService';
import { QueryParameterNames, LogoutActions, ApplicationPaths } from './ApiAuthorizationConstants';

// The main responsibility of this component is to handle the user's logout process.
// This is the starting point for the logout process, which is usually initiated when a
// user clicks on the logout button on the LoginMenu component.
export const Logout = (props: {action: string}) => {
    const [message, setMessage] = useState<string|undefined>();
    const [isReady, setIsReady] = useState<boolean>(false);
    const [, setAuthenticated] = useState<boolean>(false);

    useEffect(() => {
        const action = props.action;

        async function handleAction() {
            switch (action) {
                case LogoutActions.Logout:
                    if (!!window.history.state.state.local) {
                        logout(getReturnUrl());
                    } else {
                        // This prevents regular links to <app>/authentication/logout from triggering a logout
                        setIsReady(true);
                        setMessage("The logout was not initiated from within the page.");
                    }
                    break;
                case LogoutActions.LogoutCallback:
                    processLogoutCallback();
                    break;
                case LogoutActions.LoggedOut:
                    setIsReady(true);
                    setMessage("You successfully logged out!");
                    navigateToReturnUrl("https://localhost:5001/Identity/Account/Login");
                    break;
                default:
                    throw new Error(`Invalid action '${action}'`);
            }
        }

        handleAction();
        populateAuthenticationState();

    }, [props.action])

    async function logout(returnUrl: string) {
        const state = { returnUrl };
        const isauthenticated = await authService.isAuthenticated();
        if (isauthenticated) {
            const result: any = await authService.signOut(state);
            switch (result.status) {
                case AuthenticationResultStatus.Redirect:
                    break;
                case AuthenticationResultStatus.Success:
                    await navigateToReturnUrl(returnUrl);
                    break;
                case AuthenticationResultStatus.Fail:
                    setMessage(result.message);
                    break;
                default:
                    throw new Error("Invalid authentication result status.");
            }
        } else {
            setMessage("You successfully logged out!");
        }
    }

    async function processLogoutCallback() {
        const url = window.location.href;
        const result: any = await authService.completeSignOut(url);
        switch (result.status) {
            case AuthenticationResultStatus.Redirect:
                // There should not be any redirects as the only time completeAuthentication finishes
                // is when we are doing a redirect sign in flow.
                throw new Error('Should not redirect.');
            case AuthenticationResultStatus.Success:
                await navigateToReturnUrl(getReturnUrl(result.state));
                break;
            case AuthenticationResultStatus.Fail:
                setMessage(result.message);
                break;
            default:
                throw new Error("Invalid authentication result status.");
        }
    }

    async function populateAuthenticationState() {
        const authenticated = await authService.isAuthenticated();
        setIsReady(true);
        setAuthenticated(authenticated);
    }

    function getReturnUrl(state?: any): string {
        const params = new URLSearchParams(window.location.search);
        const fromQuery = params.get(QueryParameterNames.ReturnUrl);
        if (fromQuery && !fromQuery.startsWith(`${window.location.origin}/`)) {
            // This is an extra check to prevent open redirects.
            throw new Error("Invalid return url. The return url needs to have the same origin as the current page.")
        }
        return (state && state.returnUrl) ||
            fromQuery ||
            `${window.location.origin}${ApplicationPaths.LoggedOut}`;
    }

    function navigateToReturnUrl(returnUrl: string): void {
        return window.location.replace(returnUrl);
    }

    const Logout = () => {
        if (!isReady) {
            return <div></div>
        }
        if (!!message) {
            return (<div>{message}</div>);
        } else {
            const action = props.action;
            switch (action) {
                case LogoutActions.Logout:
                    return (<div>Processing logout</div>);
                case LogoutActions.LogoutCallback:
                    return (<div>Processing logout callback</div>);
                case LogoutActions.LoggedOut:
                    return (<div>{message}</div>);
                default:
                    throw new Error(`Invalid action '${action}'`);
            }
        }
    }

    return (
        <div>
            <Logout/>
        </div>
    )
}

