import * as ByuJwt from 'byu-jwt'

export = byuOAuth

declare function byuOAuth (clientId: string, clientSecret: string, options?: ByuJwt.Options): Promise<byuOAuth.ByuOAuth>

declare namespace byuOAuth {

    export interface ByuOAuth {
        getAuthorizationUrl (redirectUri: string, state?: string): Promise<string>,
        getClientGrantToken (): Promise<ByuToken>,
        getAuthCodeGrantToken (code: string, redirectUri: string): Promise<ByuToken>,
        refreshToken (refreshToken: string) : Promise<ByuToken>,
        revokeToken (accessToken: string, refreshToken?: string) : Promise<ByuToken>,

        authorizationEndpoint: string,
        idTokenSigningAlgorithmValuesSupported: Array<string>,
        issuer: string,
        jwksUri: string,
        responseTypesSupported: Array<string>,
        revocationEndpoint: string,
        scopesSupported: Array<string>,
        subjectTypesSupported: Array<string>,
        tokenEndpoint: string,
        userInfoEndpoint: string
    }

    export interface ByuToken {
        accessToken: string,
        expiresAt: Date,
        expiresIn: number,
        resourceOwner?: ResourceOwner|void,
        refreshToken?: string,
        scope: string,
        type: string
    }

    export interface ResourceOwner {
        atHash: string,
        aud: Array<string>,
        authTime: number,
        azp: string,
        byuId: string,
        exp: number,
        iat: number,
        iss: string,
        jwt: string,
        netId: string,
        personId: string,
        preferredFirstName: string,
        prefix: string,
        restOfName: string,
        sortName: string,
        sub: string,
        suffix: string,
        surname: string,
        surnamePosition: string
    }
}
