# WebXR Input Profiles

[![Build Status](https://travis-ci.com/immersive-web/webxr-input-profiles.svg?branch=master)](https://travis-ci.org/immersive-web/webxr-input-profiles)

## Overview
This repository contains the four separate packages.
* The [registry](./packages/registry/README.md) package contains JSON files which define the intrinsic values for each type of `XRInputSource` hardware to ensure User Agent conformity.
* The [assets](./packages/assets/README.md) package contains 3D assets and JSON files to describe the relationship between those assets and the associated `XRInputSource`.
* The [motion-controllers](./packages/motion-controllers/README.md) package contains a javascript library able to load the JSON descriptions published from the [assets](./packages/assets/README.md) package and create component-style representations of the `XRInputSource` data. This library is 3D engine agnostic.
* The [viewer](./packages/viewer/README.md) package contains webpage page that uses the [motion-controllers](./packages/motion-controllers/README.md) library to load and view the profiles and assets from the [assets](./packages/assets/README.md) package.

The [Profile Viewer](https://immersive-web.github.io/webxr-input-profiles/packages/viewer/dist/index.html) built out of the [viewer](./packages/viewer/README.md) package is also hosted by this repository.


