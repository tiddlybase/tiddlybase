import { promisify } from "util";
import { exec } from "child_process";

// based on: https://stackoverflow.com/questions/71172505/async-child-process-exec-with-typescript

const execPromise = promisify(exec);

export const runCommand = async (command: string) => {
  const { stdout, stderr } = await execPromise(command);
  return {
    stdout,
    stderr
  };
};
