import { register } from 'node:module'
import { pathToFileURL } from 'node:url'
register('./_loader-ts.mjs', pathToFileURL('./scripts/'))
