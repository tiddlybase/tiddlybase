import peerDepsExternal from "rollup-plugin-peer-deps-external";
import replace from '@rollup/plugin-replace';
import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { terser } from "rollup-plugin-terser";

const extensions = ['.js', '.ts', '.tsx'];

export default {
  input: './src/mdx-client/mdx-client.ts',
  output: {
    sourcemap: true,
    compact: true,
    name: 'mdx_client',
    file: './static/files/mdx-client.js',
    format: 'commonjs',
  },
  treeshake: 'smallest',
  plugins: [
    peerDepsExternal(),
    resolve(),
    replace({
      preventAssignment: true,
      'process.env.NODE_ENV': JSON.stringify('production'),
    }),
    commonjs({
      include: /node_modules/,
    }),
    typescript({
      tsconfig: 'tsconfig-mdx-client.json'
    }),
    json(),
    terser()
  ]
}
