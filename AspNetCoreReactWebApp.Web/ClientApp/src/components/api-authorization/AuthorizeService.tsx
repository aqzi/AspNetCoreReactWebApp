import { User, UserManager, WebStorageStateStore } from 'oidc-client';
import { ApplicationPaths, ApplicationName } from './ApiAuthorizationConstants';

export class AuthorizeService {
    _callbacks: {callback: (() => Promise<void>), subscription: number}[] = [];
    _nextSubscriptionId = 0;
    _user:User|null|undefined = null;
    _isAuthenticated = false;
    userManager: UserManager|undefined;

    // By default pop ups are disabled because they don't work properly on Edge.
    // If you want to enable pop up authentication simply set this flag to false.
    _popUpDisabled = true;

    async isAuthenticated() {
        const user = await this.getUser();
        return !!user;
    }

    async getUser() {
        if (this._user && this._user.profile) {
            return this._user.profile;
        }
        
        await this.ensureUserManagerInitialized();
        const user = await this.getValidUserMng(this.userManager).getUser();

        return user && user.profile;
    }

    async getAccessToken() {
        await this.ensureUserManagerInitialized();
        const user = await this.getValidUserMng(this.userManager).getUser();
        return user && user.access_token;
    }

    // We try to authenticate the user in three different ways:
    // 1) We try to see if we can authenticate the user silently. This happens
    //    when the user is already logged in on the IdP and is done using a hidden iframe
    //    on the client.
    // 2) We try to authenticate the user using a PopUp Window. This might fail if there is a
    //    Pop-Up blocker or the user has disabled PopUps.
    // 3) If the two methods above fail, we redirect the browser to the IdP to perform a traditional
    //    redirect flow.
    async signIn(state: {returnUrl: string}|string|null) {
        await this.ensureUserManagerInitialized();
        try {
            const silentUser = await this.getValidUserMng(this.userManager).signinSilent(this.createArguments());
            this.updateState(silentUser);
            return this.success(state);
        } catch (silentError) {
            // User might not be authenticated, fallback to popup authentication
            console.log("Silent authentication error: ", silentError);

            try {
                if (this._popUpDisabled) {
                    throw new Error('Popup disabled. Change \'AuthorizeService.js:AuthorizeService._popupDisabled\' to false to enable it.')
                }

                const popUpUser = await this.getValidUserMng(this.userManager).signinPopup(this.createArguments());
                this.updateState(popUpUser);
                return this.success(state);
            } catch (popUpError) {
                if (((popUpError as any).message as string) === "Popup window closed") {
                    // The user explicitly cancelled the login action by closing an opened popup.
                    return this.error("The user closed the window.");
                } else if (!this._popUpDisabled) {
                    console.log("Popup authentication error: ", popUpError);
                }

                // PopUps might be blocked by the user, fallback to redirect
                try {
                    await this.getValidUserMng(this.userManager).signinRedirect(this.createArguments(state));
                    return this.redirect();
                } catch (redirectError) {
                    console.log("Redirect authentication error: ", redirectError);
                    return this.error(((redirectError as any).message as string));
                }
            }
        }
    }

    async completeSignIn(url: string) {
        try {
            await this.ensureUserManagerInitialized();
            const user = await this.getValidUserMng(this.userManager).signinCallback(url);
            this.updateState(user);
            return this.success(user && user.state);
        } catch (error) {
            console.log('There was an error signing in: ', error);
            return this.error('There was an error signing in.');
        }
    }

    // We try to sign out the user in two different ways:
    // 1) We try to do a sign-out using a PopUp Window. This might fail if there is a
    //    Pop-Up blocker or the user has disabled PopUps.
    // 2) If the method above fails, we redirect the browser to the IdP to perform a traditional
    //    post logout redirect flow.
    async signOut(state: {returnUrl: string}|string|null) {
        await this.ensureUserManagerInitialized();
        try {
            if (this._popUpDisabled) {
                throw new Error('Popup disabled. Change \'AuthorizeService.js:AuthorizeService._popupDisabled\' to false to enable it.')
            }

            await this.getValidUserMng(this.userManager).signoutPopup(this.createArguments());
            this.updateState(undefined);
            return this.success(state);
        } catch (popupSignOutError) {
            console.log("Popup signout error: ", popupSignOutError);
            try {
                await this.getValidUserMng(this.userManager).signoutRedirect(this.createArguments(state));
                return this.redirect();
            } catch (redirectSignOutError) {
                console.log("Redirect signout error: ", redirectSignOutError);
                return this.error(((redirectSignOutError as any).message as string));
            }
        }
    }

    async completeSignOut(url: string) {
        await this.ensureUserManagerInitialized();
        try {
            const response: any = await this.getValidUserMng(this.userManager).signoutCallback(url);
            this.updateState(null);
            return this.success(response && response.data);
        } catch (error) {
            console.log(`There was an error trying to log out '${error}'.`);
            return this.error(((error as any).message as string));
        }
    }

    updateState(user: User|null|undefined) {
        this._user = user;
        this._isAuthenticated = !!this._user;
        this.notifySubscribers();
    }

    subscribe(callback: (() => Promise<void>)) {
        this._callbacks.push({ callback, subscription: this._nextSubscriptionId++ });
        return this._nextSubscriptionId - 1;
    }

    unsubscribe(subscriptionId: number) {
        const subscriptionIndex = this._callbacks
            .map((element: {callback: (() => Promise<void>), subscription: number}, index) => element.subscription === subscriptionId ? { found: true, index } : { found: false })
            .filter(element => element.found === true);
        if (subscriptionIndex.length !== 1) {
            throw new Error(`Found an invalid number of subscriptions ${subscriptionIndex.length}`);
        }

        const index = subscriptionIndex[0].index;
        if(index) this._callbacks.splice(index, 1);
    }

    notifySubscribers() {
        for (let i = 0; i < this._callbacks.length; i++) {
            const cb: {callback: (() => Promise<void>), subscription: number} = this._callbacks[i];
            const callback = cb.callback;
            callback();
        }
    }

    createArguments(state?: {returnUrl: string}|string|null) {
        return { useReplaceToNavigate: true, data: state };
    }

    error(message: string) {
        return { status: AuthenticationResultStatus.Fail, message };
    }

    success(state: string|null|{returnUrl: string}) {
        return { status: AuthenticationResultStatus.Success, state };
    }

    redirect() {
        return { status: AuthenticationResultStatus.Redirect };
    }

    async ensureUserManagerInitialized() {
        if (this.userManager !== undefined) {
            return;
        }

        let response = await fetch(ApplicationPaths.ApiAuthorizationClientConfigurationUrl);
        if (!response.ok) {
            throw new Error(`Could not load settings for '${ApplicationName}'`);
        }

        let settings = await response.json();
        settings.automaticSilentRenew = true;
        settings.includeIdTokenInSilentRenew = true;
        settings.userStore = new WebStorageStateStore({
            prefix: ApplicationName
        });

        this.userManager = new UserManager(settings);

        this.userManager.events.addUserSignedOut(async () => {
            await this.getValidUserMng(this.userManager).removeUser();
            this.updateState(undefined);
        });
    }

    getValidUserMng(userMng: UserManager|undefined): UserManager {
        return userMng as UserManager
    }

    static get instance() { return authService }
}

const authService = new AuthorizeService();

export default authService;

export const AuthenticationResultStatus = {
    Redirect: 'redirect',
    Success: 'success',
    Fail: 'fail'
};
