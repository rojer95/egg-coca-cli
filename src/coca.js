#!/usr/bin/env node
'use strict';
const program = require('commander');
const path = require('path');
const fs = require('fs');
const exec = require('child_process').exec;

const runner = sh => {
  return new Promise((resolve, reject) => {
    exec(sh, { cwd: process.cwd() }, (err, msg) => {
      if (err) {
        reject(err);
      } else {
        console.log(msg);
        resolve();
      }
    });
  });
};

program.version('1.0.0');

program.command('rsa').action(async function() {
  console.log('process.cwd() is ', process.cwd());
  const private_path = path.join(
    process.cwd(),
    './config/rsa/rsa_private_key.pem'
  );
  const public_path = path.join(
    process.cwd(),
    './config/rsa/rsa_public_key.pem'
  );

  await runner(`openssl genrsa -out ${private_path} 1024`);
  await runner(`openssl rsa -in ${private_path} -pubout -out ${public_path}`);
});

program
  .command('migrate')
  .option(
    '-e, --env [env]',
    'The environment to run the command in',
    'development'
  )
  .action(async function(options) {
    console.log('process.cwd() is ', process.cwd());

    const plugins = fs.readdirSync(path.join(process.cwd(), './lib/plugin'));

    for (const plugin of plugins) {
      const stat = fs.statSync(
        path.join(process.cwd(), './lib/plugin', plugin)
      );

      if (
        stat.isDirectory() &&
        fs.existsSync(
          path.join(process.cwd(), './lib/plugin', plugin, 'migrations')
        )
      ) {
        await runner(
          `npx sequelize db:migrate --env=${options.env} --config=${path.join(
            process.cwd(),
            './database/config.json'
          )} --migrations-path=${path.join(
            process.cwd(),
            './lib/plugin',
            plugin,
            'migrations'
          )}`
        );
      }
    }

    await runner(
      `npx sequelize db:migrate --env=${options.env} --config=${path.join(
        process.cwd(),
        './database/config.json'
      )}`
    );
  });

program
  .command('add')
  .description('add a migration')
  .option('-p, --plugin [name]', 'Which setup mode to use')
  .option(
    '-e, --env [env]',
    'The environment to run the command in',
    'development'
  )
  .option('-c, --config [path]', 'The path to the config file')
  .option(
    '-o, --options-path  [path]',
    'The path to a JSON file with additional options'
  )
  .option(
    '-s, --seeders-path  [path]',
    'The path to the seeders folder',
    'seeders'
  )
  .option(
    '-m, --models-path  [path]',
    'The path to the models folder',
    'models'
  )
  .option(
    '-u, --url  [url]',
    'The database connection string to use. Alternative to using --config files'
  )
  .option('-d, --debug', 'When available show various debug information', false)
  .requiredOption('-n, --name [name]', 'Defines the name of the migration')
  .option(
    '-ud, --underscored',
    "Use snake case for the timestamp's attribute names",
    false
  )
  .action(function(options) {
    console.log('process.cwd() is ', process.cwd());
    const args = [];
    if (options.env) args.push(`--env=${options.env}`);
    if (options.config) args.push(`--config=${options.config}`);
    if (options['options-path']) {
      args.push(`--options-path=${options['options-path']}`);
    }

    if (options['seeders-path']) {
      args.push(`--seeders-path=${options['seeders-path']}`);
    }

    if (options['models-path']) {
      args.push(`--models-path=${options['models-path']}`);
    }

    if (options.url) args.push(`--url=${options.url}`);
    if (options.name) args.push(`--name=${options.name}`);
    if (options.debug) args.push('--debug');
    if (options.underscored) args.push('--underscored');

    if (options.plugin) {
      args.push(
        `--migrations-path=${path.join(
          process.cwd(),
          `lib/plugin/egg-coca-${options.plugin}`,
          'migrations'
        )}`
      );
    }

    exec(`npx sequelize migration:generate ${args.join(' ')}`, function(
      err,
      msg
    ) {
      if (err) {
        console.log(err.message);
      } else {
        console.log(msg);
      }
    });
  });

program.parse(process.argv);
