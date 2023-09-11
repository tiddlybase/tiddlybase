import { DEFAULT_LAUNCH_PARAMETERS } from '../src/constants';
import { parseLaunchParameters as _parseLaunchParameters} from '../src/launch-parameters';
import { LaunchParameters } from '../src/tiddlybase-config-schema';

const parseLaunchParameters = (url:string, defaults:Partial<LaunchParameters>={}) => _parseLaunchParameters(new URL(url), defaults);

const DEFAULT_LP:LaunchParameters = {...DEFAULT_LAUNCH_PARAMETERS, getParameters: {}}

describe('parseLaunchParameters', function () {

  it('can extract instance name from path', async () => {
    expect(parseLaunchParameters("https://tiddlybase.com/")).toEqual(DEFAULT_LP);
    expect(parseLaunchParameters("https://tiddlybase.com/i/")).toEqual(DEFAULT_LP);
    expect(parseLaunchParameters("https://tiddlybase.com/i/myinstance").instance).toEqual("myinstance");
    expect(parseLaunchParameters("https://tiddlybase.com/i/myinstance/").instance).toEqual("myinstance");
    expect(parseLaunchParameters("https://tiddlybase.com/i/myinstance#hash").instance).toEqual("myinstance");
    expect(parseLaunchParameters("https://tiddlybase.com/i/myinstance/#hash").instance).toEqual("myinstance");
    expect(parseLaunchParameters("https://tiddlybase.com/i/myinstance77/").instance).toEqual("myinstance77");
    expect(parseLaunchParameters("https://tiddlybase.com/i/my%20instance/")).toEqual(DEFAULT_LP);
  });

  it('can extract launchConfig name from path', async () => {
    expect(parseLaunchParameters("https://tiddlybase.com/lc/asdf").launchConfig).toEqual("asdf");
    expect(parseLaunchParameters("https://tiddlybase.com/lc/asdf").instance).toEqual(DEFAULT_LP.instance);
    expect(parseLaunchParameters("https://tiddlybase.com/lc/asdf/").launchConfig).toEqual("asdf");
    expect(parseLaunchParameters("https://tiddlybase.com/lc/asdf/i/myinstance")).toEqual({
      ...DEFAULT_LP,
      instance: "myinstance",
      launchConfig: "asdf"
    });
  })

});
