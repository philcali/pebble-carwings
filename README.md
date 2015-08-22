# Carwings Pebble

A simple pebble watch app provides an interface for
Nissan Leaf battery monitoring, remote controls, and
other things available via the Carwings service.

## Proxy Server

The configuration pages can be found on the [proxy server][1].
The purpose of the proxy server is to maintain the carwings
authenticated session via REST interaction. The proxy server
must be running, and you can easy run a local copy of it.

## Build

```
git submodule init --update && ./linker && cd pebblejs
pebble build && pebble install --emulator basalt --logs
```

[1]: https://github.com/philcali/proxy-wings
