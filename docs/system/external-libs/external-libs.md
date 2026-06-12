# External Libraries & Integrations

The `packages/external/` directory contains forks of third-party, open-source packages that have been customized or modified specifically for the vLab project. Instead of waiting for upstream pull requests, we bring these packages directly into the monorepo to safely maintain our necessary modifications.

## Current Integrations

### Mikro-RouterOS (`packages/external/mikro-routeros`)

This package is a fork of the [mdshemul48/mikro-routeros](https://github.com/mdshemul48/mikro-routeros) library, which provides a Node.js client for communicating with MikroTik RouterOS instances over the network.

- **Our Modification:** We added support for streaming via the `listen` command from the MikroTik RouterOS API, a feature not natively supported in the original repository.
- **Usage:** It is primarily utilized by the Lab Evaluation Engine (`@vlab/evaluator`). When a rule requires checking the specific BGP configuration or routing table of a MikroTik container, the Worker uses this package to authenticate with the container, execute the necessary API queries, and return the structured data to the evaluator for scoring.

