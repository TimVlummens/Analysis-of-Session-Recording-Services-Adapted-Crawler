# Analysis of Session Recording Services
We extended the [Tracker Radar Collector](https://github.com/duckduckgo/tracker-radar-collector) to detect session replay scripts. This was done by adding a new collector which interacts with the page and collects event listeners.

## How do I use it?

### Use it from the command line

1. Clone this project locally (`git clone git@github.com:duckduckgo/tracker-radar-collector.git`)
2. Install all dependencies (`npm i`)
3. Run the command line tool:

```sh
npm run crawl -- -u "https://example.com" -o ./data/ -v
```

Other example commands can be found in the cmdCommandSheet.txt file.

Available options:

- `-o, --output <path>` - (required) output folder where output files will be created
- `-u, --url <url>` - single URL to crawl
- `-i, --input-list <path>` - path to a text file with list of URLs to crawl (each in a separate line)
- `-d, --data-collectors <list>` - comma separated list (e.g `-d 'requests,cookies'`) of data collectors that should be used (all by default)
- `-c, --crawlers <number>` - override the default number of concurrent crawlers (default number is picked based on the number of CPU cores)
- `--reporters <list>` - comma separated list (e.g. `--reporters 'cli,file,html'`) of reporters to be used ('cli' by default)
- `-v, --verbose` - instructs reporters to log additional information (e.g. for "cli" reporter progress bar will not be shown when verbose logging is enabled)
- `-l, --log-path <path>` - instructs reporters where all logs should be written to
- `-f, --force-overwrite` - overwrite existing output files (by default entries with existing output files are skipped)
- `-3, --only-3p` - don't save any first-party data (e.g. requests, API calls for the same eTLD+1 as the main document)
- `-m, --mobile` - emulate a mobile device when crawling
- `-p, --proxy-config <host>` - optional SOCKS proxy host
- `-r, --region-code <region>` - optional 2 letter region code. For metadata only
- `-a, --disable-anti-bot` - disable simple build-in anti bot detection script injected to every frame
- `--chromium-version <version_number>` - use custom version of Chromium (e.g. "843427") instead of using the default
- `--config <path>` - path to a config file that allows to set all the above settings (and more). Note that CLI flags have a higher priority than settings passed via config. You can find a sample config file in `tests/cli/sampleConfig.json`.
- `--autoconsent-action <action>` - automatic autoconsent action (requires the `cmps` collector). Possible values: optIn, optOut

## Output format

Each successfully crawled website will create a separate file named after the website (when using the CLI tool). Output data format is specified in `crawler.js` (see `CollectResult` type definition).
Additionally, for each crawl `metadata.json` file will be created containing crawl configuration, system configuration and some high-level stats. 
