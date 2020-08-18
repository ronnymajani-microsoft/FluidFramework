/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { BaseHost, IBaseHostConfig } from "@fluidframework/base-host";
import { IProxyLoaderFactory, IResolvedFluidCodeDetails } from "@fluidframework/container-definitions";
import {
    IDocumentServiceFactory,
    IFluidResolvedUrl,
} from "@fluidframework/driver-definitions";
import { WebWorkerLoaderFactory } from "@fluidframework/execution-context-loader";
import { OdspDocumentServiceFactory } from "@fluidframework/odsp-driver";
import { DefaultErrorTracking, RouterliciousDocumentServiceFactory } from "@fluidframework/routerlicious-driver";
import { ContainerUrlResolver } from "@fluidframework/routerlicious-host";
import { IGitCache } from "@fluidframework/server-services-client";
import { HTMLViewAdapter } from "@fluidframework/view-adapters";
import { SemVerCdnCodeResolver } from "@fluidframework/web-code-loader";
import { DocumentFactory } from "./documentFactory";
import { IHostServices } from "./services";
import { seedFromScriptIds } from "./helpers";
import { debug } from "./debug";

async function getComponentAndRender(baseHost: BaseHost, url: string, div: HTMLDivElement) {
    const component = await baseHost.requestFluidObject(url);
    if (component === undefined) {
        return;
    }

    // Render the component with an HTMLViewAdapter to abstract the UI framework used by the component
    const view = new HTMLViewAdapter(component);
    view.render(div, { display: "block" });
}

export async function initialize(
    url: string,
    resolved: IFluidResolvedUrl,
    cache: IGitCache,
    pkg: IResolvedFluidCodeDetails | undefined,
    scriptIds: string[],
    jwt: string,
    config: any,
    clientId: string,
    user: any,
) {
    const documentFactory = new DocumentFactory(config.tenantId);

    const services: IHostServices = {
        IDocumentFactory: documentFactory,
    };

    const documentServiceFactories: IDocumentServiceFactory[] = [];
    // TODO: need to be support refresh token
    documentServiceFactories.push(new OdspDocumentServiceFactory(
        async () => Promise.resolve(resolved.tokens.storageToken),
        async () => Promise.resolve(resolved.tokens.socketToken)));

    documentServiceFactories.push(new RouterliciousDocumentServiceFactory(
        false,
        new DefaultErrorTracking(),
        false,
        true,
        cache));

    const resolver = new ContainerUrlResolver(
        document.location.origin,
        jwt,
        new Map<string, IFluidResolvedUrl>([[url, resolved]]));

    const hostConfig: IBaseHostConfig = {
        documentServiceFactory: documentServiceFactories,
        urlResolver: resolver,
        config,
        codeResolver: new SemVerCdnCodeResolver(),
        scope: services,
        proxyLoaderFactories: new Map<string, IProxyLoaderFactory>([["webworker", new WebWorkerLoaderFactory()]]),
    };

    // Provide access to all loader services from command line for easier testing as we bring more up
    // eslint-disable-next-line dot-notation
    window["allServices"] = services;

    const baseHost = new BaseHost(hostConfig, seedFromScriptIds(pkg, scriptIds));
    const loader = await baseHost.getLoader();
    documentFactory.resolveLoader(loader);

    debug(`Loading ${url}`);

    const div = document.getElementById("content") as HTMLDivElement;

    const container = await baseHost.initializeContainer(url, pkg);

    // Currently this contextChanged handler covers both the initial load (from NullRuntime) as well as the upgrade
    // scenario.  In the next version of base-host it will only be for the upgrade scenario.
    container.on("contextChanged", () => {
        getComponentAndRender(baseHost, url, div).catch(() => { });
    });
    await getComponentAndRender(baseHost, url, div);

    container.on("error", (error) => {
        console.error(error);
    });

    return container;
}
