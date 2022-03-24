
/**
 * Copyright 2022. TIBCO Software Inc.
 * This file is subject to the license terms contained
 * in the license file that is distributed with this file.
 */

 const { flags } = require('@oclif/command')
let fs = require('fs');
let GraphQl = require('graphql');
let path = require('path');
let AdmZip = require("adm-zip");
let TCBaseCommand = require('@tibco-software/cic-cli-core').TCBaseCommand;
let UX = require('@tibco-software/cic-cli-core').ux;

class GenerateApp extends TCBaseCommand {
  sleep(ms) {
    return new Promise((resolve, reject) => {
      setTimeout(resolve, ms);
    })
  }
  async run() {

    const { flags } = this.parse(GenerateApp)
    const buildFolderName = "tcapim-graphql-proxy-" + Date.now()
    const schemaPath = flags.schema
    const appName = flags.name
    const repo = flags.repo
    const nocache = flags['no-cache']
    const forceOverwrite = flags.force
    const deployToCloud = flags.deploy
    const currFolder = path.resolve('.')
    const spinner = await UX.spinner();
    const timeout = 5000;
    let tcReq = this.getTCRequest();
    let httpreq = this.getHTTPRequest();
    let schemaFile

    // download schema
    if (schemaPath.includes("http")) {
      spinner.start("Downloading Schema");      
      try {
        let query = GraphQl.getIntrospectionQuery()
        let schemaResponse = await tcReq.doRequest(schemaPath, { method: "POST"}, { operationName: "IntrospectionQuery", query } , {})
        const graphqlSchemaObj = GraphQl.buildClientSchema(schemaResponse.body.data);
        schemaFile = GraphQl.printSchema(graphqlSchemaObj);
        spinner.succeed("Downloaded Schema");
      } catch (e) {
        spinner.fail("Failed to download schema");
        console.log(e)
        return
      }
    }
    else {
      schemaFile = fs.readFileSync(schemaPath, 'utf-8')
    }

    // validate schema
    spinner.start("Validating Schema");
    try {
      GraphQl.buildSchema(schemaFile)
    } catch (e) {
      spinner.succeed("Failed to validate schema");
      console.error(e)
    }
    spinner.succeed("Validated Schema");

    let cachePath = this.config.cacheDir + "/tcapim-cli-plugin-dev"
    fs.mkdirSync(cachePath, {
      recursive: true,
    }, (err) => {
      if (err) {
        return console.error(err);
      }
    });
    try {
      if (!fs.existsSync(cachePath + "/tcapim-graphql-proxy.zip")) {
        spinner.start("Downloading template application");
        await httpreq.download(repo + "/releases/latest/download/tcapim-graphql-proxy.zip", cachePath + "/tcapim-graphql-proxy.zip")
        await httpreq.download(repo + "/releases/latest/download/manifest.json", cachePath + "/manifest.json")
        spinner.succeed("Downloaded template application");
      }
    } catch (err) {
      spinner.fail("Failed to download template application");
      process.exit(1);
    }
    if (nocache) {
      try {
        spinner.start("Downloading template application");
        await httpreq.download(repo + "/releases/latest/download/tcapim-graphql-proxy.zip", cachePath + "/tcapim-graphql-proxy.zip")
        await httpreq.download(repo + "/releases/latest/download/manifest.json", cachePath + "/manifest.json")
        spinner.succeed("Downloaded template application");
      } catch (err) {
        spinner.fail("Failed to download template application");
        process.exit(1);
      }
    }

    spinner.start("Creating NodeJS application");

    // Edit manifest file 
    let filePath = path.join(cachePath, '/manifest.json');
    fs.mkdirSync(currFolder + "/" + buildFolderName, {
      recursive: true,
    }, (err) => {
      if (err) {
        return console.error(err);
      }
    });
    fs.readFile(filePath, 'utf8', function (err, data) {
      if (err) {
        return console.log(err);
      }
      let result = data.replace(/tcapim-graphql-proxy/g, appName);

      fs.writeFile(path.join(currFolder + "/" + buildFolderName + "/manifest.json"), result, 'utf8', function (err) {
        if (err) return console.log(err);
      });
    });
    fs.copyFileSync(path.join(cachePath, '/tcapim-graphql-proxy.zip'), path.join(currFolder + "/" + buildFolderName + "/" + buildFolderName + ".zip"))

    let zip = new AdmZip(path.join(currFolder + "/" + buildFolderName + "/" + buildFolderName + ".zip"));
    zip.extractAllTo(path.join(currFolder + "/" + buildFolderName))
    fs.writeFileSync(currFolder + "/" + buildFolderName + "/" + "package/src/config" + "/schema.graphql", schemaFile, 'utf8', function (err) {
      if (err) return console.log(err);
    });
    fs.rmSync(path.join(currFolder + "/" + buildFolderName + "/" + buildFolderName + ".zip"))
    zip = new AdmZip();
    zip.addLocalFolder(path.join(currFolder + "/" + buildFolderName + "/" + "package"))
    zip.writeZip(path.join(currFolder + "/" + buildFolderName + "/" + buildFolderName + ".zip"))
    fs.rmSync(path.join(currFolder + "/" + buildFolderName + "/package"), { recursive: true, force: true })
    spinner.succeed("Created NodeJS application in " + buildFolderName);

    if (deployToCloud) {
      let appProperties = {
        endpointVisibility: "mesh",
        deploymentStage: "live",
        tags: [
          "tcapim-inline-proxy"
        ]
      }
      spinner.start("Deploying application to TIBCO Cloud. This may take a while");
      let data = {
        artifact: "file://" + path.join(currFolder + "/" + buildFolderName + "/" + buildFolderName + ".zip"),
        'manifest.json': "file://" + path.join(currFolder + "/" + buildFolderName + "/manifest.json")
      };      
      try {
        let resp = await tcReq.upload("/tci/v1/subscriptions/0/apps?appName=" + appName + "&instanceCount=1&forceOverwrite=" + forceOverwrite + "&retainAppProps=true", data, {}, false);
        let status
        do {
          await this.sleep(timeout)
          status = await tcReq.doRequest("/tci/v1/subscriptions/0/apps/" + resp.body.appId + "/status")
          if (status.body.instanceStatus.failed != 0) {
            throw err
          }
        } while (status.body.instanceStatus.running == 0 && status.body.instanceStatus.failed == 0)
        await this.sleep(timeout)
        await tcReq.doRequest("/tci/v1/subscriptions/0/apps/" + resp.body.appId, { method: "PUT", data: appProperties });
        spinner.succeed("Application deployed to TIBCO Cloud");
      } catch (err) {
        spinner.fail("Failed to deploy the application to TIBCO Cloud")
        console.error(err.httpResponse.errorDetail)
      }
    }
  }
}

GenerateApp.description = `Create a NodeJS app to validate graphql requests

This application is used as Pre-Processor for TIBCO Cloud API Management for validating graphql requests. 
The validation policies include - Max query depth, disabling Introspection and Mutation queries and restricting specific object.
Application code is available at: https://github.com/TIBCOSoftware/tcapim-graphql-proxy`

GenerateApp.flags = {
  ...TCBaseCommand.flags,
  name: flags.string({ char: 'n', description: 'Name of the nodeJS app', required: true }),
  schema: flags.string({ char: 's', description: 'Graphql schema. Supports reading from a file or query graphql server', required: true }),
  deploy: flags.boolean({ char: 'd', description: 'Deploy and run the application on TIBCO Cloud', default: false }),
  force: flags.boolean({ char: 'f', description: 'Force overwrite existing applications', default: false }),
  repo: flags.string({ description: "Template code repository", default: "https://github.com/TIBCOSoftware/tcapim-graphql-proxy" }),
  "no-cache": flags.boolean({ description: "Set as true to download latest github release", default: false })
}

module.exports = GenerateApp
