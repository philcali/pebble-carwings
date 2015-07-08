# Carwings Pebble

A simple pebble watch app provides an interface for
Nissan Leaf battery monitoring, remote controls, and
other things available via the Carwings service.

## Configuration Page

The configuration pages can be found in `web`, and can be hosted
on any old static web hosting site. The submission is processed
on the `pebblejs` protocol via the Pebble app.

## Build

```
git submodule init --update && ./linker && cd pebblejs
pebble build && pebble install --emulator basalt --logs
```
