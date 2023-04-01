import React, { Fragment, useEffect, useRef, useState } from 'react';
import { NavItem, NavLink } from 'reactstrap';
import { Link } from 'react-router-dom';
import authService from './AuthorizeService';
import { ApplicationPaths } from './ApiAuthorizationConstants';

export const LoginMenu = () => {
    const subscription = useRef(0);
    const [authenticated, setAuthenticated] = useState<boolean>(false);

    useEffect(() => {
        subscription.current = authService.subscribe(() => populateState());
        populateState();

        return () => {
            authService.unsubscribe(subscription.current);
        }
    },[])

    async function populateState() {
        const [isAuthenticated] = await Promise.all([authService.isAuthenticated()])

        if(isAuthenticated) setAuthenticated(isAuthenticated);
    }

    const ReturnView = () => {
        if (!authenticated) {
            const registerPath = `${ApplicationPaths.Register}`;
            const loginPath = `${ApplicationPaths.Login}`;
            return <AnonymousView registerPath={registerPath} loginPath={loginPath}/>
        } else {
            const profilePath = `${ApplicationPaths.Profile}`;
            const logoutPath = { pathname: `${ApplicationPaths.LogOut}`, state: { local: true } };
            return <AuthenticatedView profilePath={profilePath} logoutPath={logoutPath}/>
        }
    }

    const AuthenticatedView = (props: {profilePath: string, logoutPath: {pathname: string, state: {local: boolean}}}) => {
        return (
            <Fragment>
                <NavItem>
                    <NavLink tag={Link} className="text-dark" to={props.profilePath}>Profile</NavLink>
                </NavItem>
                <NavItem>
                    <NavLink tag={Link} className="text-dark" to={props.logoutPath}>Logout</NavLink>
                </NavItem>
            </Fragment>
        );
    }

    const AnonymousView = (props: {registerPath: string, loginPath: string}) => {
        return (
            <Fragment>
                <NavItem>
                    <NavLink tag={Link} className="text-dark" to={props.registerPath}>Register</NavLink>
                </NavItem>
                <NavItem>
                    <NavLink tag={Link} className="text-dark" to={props.loginPath}>Login</NavLink>
                </NavItem>
            </Fragment>
        );
    }

    return (
        <ReturnView/>
    )
}