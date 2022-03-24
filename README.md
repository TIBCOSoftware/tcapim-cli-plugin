CLI Plugin for TIBCO Cloud™ API Management
=================

CLI Plugin to create and manage TIBCO Cloud™ API Management applications. 

This plugin extends the functionality of TIBCO Cloud™ API Management by helping to manage the API artifacts and TIBCO Cloud™ Integration applications related to TIBCO Cloud API management. 
To be used as an extension of [TIBCO Cloud™ CLI](https://github.com/TIBCOSoftware/cic-cli-main)
<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
```
Install Plugin
  $ tibco plugins:install @tibco-software/cli-plugin-tcapim
USAGE
  $ tibco tcapim:graphql-policy [flags]
```
# Commands

>:exclamation: [Configure CLI](https://github.com/TIBCOSoftware/cic-cli-main#configure-cli) to access TIBCO Cloud before executing the commands.

* [`tibco tcapim:graphql-policy`](#tibco-tcapimgraphql-policy)

## `tibco tcapim:graphql-policy`
 
This command simplifies the creation and deployment of [GraphQL Policy](https://github.com/TIBCOSoftware/tcapim-graphql-proxy) application on TIBCO Cloud™ Integration.  

```
USAGE
  $ tibco tcapim:graphql-policy

OPTIONS
  -d, --deploy         Deploy and run the application on TIBCO Cloud
  -f, --force          Force overwrite existing applications
  -n, --name=name      (required) Name of the nodeJS app
  -s, --schema=schema  (required) Graphql schema. Supports reading from a file or query graphql server
  --no-cache           Set as true to download latest github release
  --no-warnings        Disable warnings from commands outputs
  --profile=profile    Switch to different org or region using profile
  --repo=repo          [default: https://github.com/TIBCOSoftware/tcapim-graphql-proxy] Template code repository

EXAMPLE
  tibco tcapim:graphql-policy --name countries-graphql-policy --schema https://countries.trevorblades.com/graphql --deploy
```
Post Deployment, the application is set as `live` and enabled for discovery with TIBCO Cloud™ Mesh.  
Users can provide their own template application using the `--repo` flag. The plugin fetches the latest release from the provided github repository.  

_See code: [src/commands/tcapim/graphql-policy.js](https://github.com/TIBCOSoftware/tcapim-cli-plugin/blob/master/src/commands/tcapim/graphql-policy.js)_

## License
This repository is governed by the license specified in the [license file](LICENSE.md). 

## Help
 The samples provided here are maintained and supported by the user community. For raising any issues or questions related to the samples provided here please create a GitHub issue.

If you would like to contribute, please send us a note at tcapim-pm@tibco.com
