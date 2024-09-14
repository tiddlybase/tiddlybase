import { InstanceConfiguration } from '@tiddlybase/shared/src/instance-spec-schema';
import { instanceConfigSchemaName, instanceConfigurationPath, instanceConfigurationTitle, makeInstanceConfiguration } from '@tiddlybase/shared/src/permissions';
import * as admin from 'firebase-admin';
import { Argv, CommandModule } from 'yargs';
import { CLIContext, withCLIContext } from './cli-context';
import { getUser } from './users'
import { writeFirestoreDocument } from './firestore';

// doSetRole(cliContext.app, user.uid, config.instanceName, cliContext.args.collection, roleNumber);
const doUpsertInstanceConfiguration = async (
  app: admin.app.App,
  instance: string,
  userId: string
): Promise<InstanceConfiguration> => {
  const docPath = instanceConfigurationPath(instance);
  const instanceConfiguration = makeInstanceConfiguration(instance, userId)
  await writeFirestoreDocument(
    app,
    userId,
    docPath,
    {
      ...instanceConfiguration,
      schema: instanceConfigSchemaName,
      title: instanceConfigurationTitle(instance)
    },
    true
  );
  return instanceConfiguration;
}

// TODO: migrate this to firestore-based ACL instead of custom JWT claims
export const createInstance: CommandModule = {
  command: 'create-instance <instance name> <owner userid|email>',
  describe: 'Create a new instance',
  builder: (argv: Argv) =>
    argv
      .positional('instance', {
        describe: 'Instance name',
        type: 'string',
      })
      .positional('userid', {
        describe: 'User id or email address',
        type: 'string',
      }),
  handler: withCLIContext(async (cliContext: CLIContext) => {
    const instance = cliContext.args.instancename as string;
    const userArg = cliContext.args.owneruserid as string;
    const user = await getUser(cliContext.app, userArg);
    const instanceConfiguration = await doUpsertInstanceConfiguration(
      cliContext.app,
      instance,
      user.uid
    );
    console.log(JSON.stringify(instanceConfiguration, null, 4));
  })
};
