/**
 * Native orbit controls for React Three Fiber on React Native.
 * Adapted from r3f-native-orbitcontrols (MIT) — drei OrbitControls uses web
 * pointer events on the GL canvas and breaks RN touch tracking.
 */
import { invalidate } from "@react-three/fiber/native";
import type { GestureResponderEvent, LayoutChangeEvent } from "react-native";
import {
  Matrix4,
  OrthographicCamera,
  PerspectiveCamera,
  Quaternion,
  Spherical,
  Vector2,
  Vector3,
} from "three";

import { MAP_TAP_DRAG_THRESHOLD_PX } from "@/constants/map-continent-focus";

const EPSILON = 0.000001;

const STATE = {
  NONE: 0,
  ROTATE: 1,
  DOLLY: 2,
} as const;

type OrbitState = (typeof STATE)[keyof typeof STATE];

type OrbitScope = {
  camera: PerspectiveCamera | OrthographicCamera | undefined;
  enabled: boolean;
  target: Vector3;
  minZoom: number;
  maxZoom: number;
  minPolarAngle: number;
  maxPolarAngle: number;
  minAzimuthAngle: number;
  maxAzimuthAngle: number;
  dampingFactor: number;
  enableZoom: boolean;
  zoomSpeed: number;
  enableRotate: boolean;
  rotateSpeed: number;
  enablePan: boolean;
  panSpeed: number;
  onChange: (event: { target: OrbitScope }) => void;
  onStart: () => void;
  onEnd: () => void;
};

export function createGlobeOrbitControls() {
  let height = 0;

  const scope: OrbitScope = {
    camera: undefined as PerspectiveCamera | OrthographicCamera | undefined,
    enabled: true,
    target: new Vector3(),
    minZoom: 0,
    maxZoom: Infinity,
    minPolarAngle: 0,
    maxPolarAngle: Math.PI,
    minAzimuthAngle: -Infinity,
    maxAzimuthAngle: Infinity,
    dampingFactor: 0.05,
    enableZoom: true,
    zoomSpeed: 1,
    enableRotate: true,
    rotateSpeed: 1,
    enablePan: false,
    panSpeed: 1,
    onChange: (_event: { target: OrbitScope }) => {},
    onStart: () => {},
    onEnd: () => {},
  };

  const internals = {
    moveStart: new Vector3(),
    rotateStart: new Vector2(),
    rotateEnd: new Vector2(),
    rotateDelta: new Vector2(),
    dollyStart: 0,
    dollyEnd: 0,
    panStart: new Vector2(),
    panEnd: new Vector2(),
    panDelta: new Vector2(),
    panOffset: new Vector3(),
    spherical: new Spherical(),
    sphericalDelta: new Spherical(),
    scale: 1,
    state: STATE.NONE as OrbitState,
  };

  let touchStartX = 0;
  let touchStartY = 0;
  let interactionExceededTapThreshold = false;
  let suppressNextTap = false;

  const resetTouchState = () => {
    internals.state = STATE.NONE;
    internals.moveStart.set(0, 0, 0);
  };

  const recordTouchStart = (event: GestureResponderEvent) => {
    const touch = event.nativeEvent.touches[0] ?? event.nativeEvent;
    touchStartX = touch.pageX;
    touchStartY = touch.pageY;
    interactionExceededTapThreshold = false;
    suppressNextTap = false;
  };

  const trackTouchMove = (event: GestureResponderEvent) => {
    const touch = event.nativeEvent.touches[0];
    if (!touch) return;
    const dx = touch.pageX - touchStartX;
    const dy = touch.pageY - touchStartY;
    if (Math.hypot(dx, dy) > MAP_TAP_DRAG_THRESHOLD_PX) {
      interactionExceededTapThreshold = true;
      // Mark immediately so R3F pointer-up can skip before RN release runs.
      suppressNextTap = true;
    }
  };

  const functions = {
    handleTouchStartRotate(event: GestureResponderEvent) {
      if (event.nativeEvent.touches.length === 1) {
        internals.rotateStart.set(
          event.nativeEvent.touches[0].locationX,
          event.nativeEvent.touches[0].locationY,
        );
      } else if (event.nativeEvent.touches.length === 2) {
        const x =
          0.5 *
          (event.nativeEvent.touches[0].locationX +
            event.nativeEvent.touches[1].locationX);
        const y =
          0.5 *
          (event.nativeEvent.touches[0].locationY +
            event.nativeEvent.touches[1].locationY);
        internals.rotateStart.set(x, y);
      }
    },

    handleTouchStartDolly(event: GestureResponderEvent) {
      if (event.nativeEvent.touches.length !== 2) return;

      const dx =
        event.nativeEvent.touches[0].locationX -
        event.nativeEvent.touches[1].locationX;
      const dy =
        event.nativeEvent.touches[0].locationY -
        event.nativeEvent.touches[1].locationY;
      internals.dollyStart = Math.sqrt(dx * dx + dy * dy);
    },

    handleTouchStartPan(event: GestureResponderEvent) {
      if (event.nativeEvent.touches.length === 1) {
        internals.panStart.set(
          event.nativeEvent.touches[0].locationX,
          event.nativeEvent.touches[0].locationY,
        );
      } else if (event.nativeEvent.touches.length === 2) {
        const x =
          0.5 *
          (event.nativeEvent.touches[0].locationX +
            event.nativeEvent.touches[1].locationX);
        const y =
          0.5 *
          (event.nativeEvent.touches[0].locationY +
            event.nativeEvent.touches[1].locationY);
        internals.panStart.set(x, y);
      }
    },

    handleTouchStartDollyPan(event: GestureResponderEvent) {
      if (scope.enableZoom) this.handleTouchStartDolly(event);
      if (scope.enablePan) this.handleTouchStartPan(event);
    },

    onTouchStart(event: GestureResponderEvent) {
      const touchCount = event.nativeEvent.touches.length;

      if (touchCount === 1) {
        if (!scope.enableRotate) return;
        this.handleTouchStartRotate(event);
        internals.state = STATE.ROTATE;
        return;
      }

      if (touchCount >= 2) {
        if (!scope.enableZoom && !scope.enablePan) return;
        this.handleTouchStartDollyPan(event);
        internals.state = STATE.DOLLY;
        return;
      }

      internals.state = STATE.NONE;
    },

    rotateLeft(angle: number) {
      internals.sphericalDelta.theta -= angle;
    },

    rotateUp(angle: number) {
      internals.sphericalDelta.phi -= angle;
    },

    handleTouchMoveRotate(event: GestureResponderEvent) {
      if (event.nativeEvent.touches.length === 1) {
        internals.rotateEnd.set(
          event.nativeEvent.locationX,
          event.nativeEvent.locationY,
        );
      } else if (event.nativeEvent.touches.length === 2) {
        const x =
          0.5 *
          (event.nativeEvent.touches[0].locationX +
            event.nativeEvent.touches[1].locationX);
        const y =
          0.5 *
          (event.nativeEvent.touches[0].locationY +
            event.nativeEvent.touches[1].locationY);
        internals.rotateEnd.set(x, y);
      }

      internals.rotateDelta
        .subVectors(internals.rotateEnd, internals.rotateStart)
        .multiplyScalar(scope.rotateSpeed);

      // Keep world-view drag feel unchanged, but reduce angular rotation as the
      // camera zooms in so panning does not feel increasingly "faster".
      const cameraDistance =
        scope.camera?.position?.distanceTo(scope.target) ?? scope.maxZoom;
      const zoomRotateScale =
        Number.isFinite(scope.maxZoom) && scope.maxZoom > 0
          ? Math.max(0.25, Math.min(1, cameraDistance / scope.maxZoom))
          : 1;

      if (height) {
        this.rotateLeft(
          ((2 * Math.PI * internals.rotateDelta.x) / height) * zoomRotateScale,
        );
        this.rotateUp(
          ((2 * Math.PI * internals.rotateDelta.y) / height) * zoomRotateScale,
        );
      }

      internals.rotateStart.copy(internals.rotateEnd);
    },

    dollyOut(dollyScale: number) {
      internals.scale /= dollyScale;
    },

    handleTouchMoveDolly(event: GestureResponderEvent) {
      if (event.nativeEvent.touches.length !== 2) return;

      const dx =
        event.nativeEvent.touches[0].locationX -
        event.nativeEvent.touches[1].locationX;
      const dy =
        event.nativeEvent.touches[0].locationY -
        event.nativeEvent.touches[1].locationY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      internals.dollyEnd = distance;

      if (internals.dollyStart > 0) {
        const ratio = internals.dollyEnd / internals.dollyStart;
        if (Number.isFinite(ratio) && ratio > 0) {
          this.dollyOut(Math.pow(ratio, scope.zoomSpeed));
        }
      }

      internals.dollyStart = internals.dollyEnd;
    },

    panLeft(distance: number, objectMatrix: Matrix4) {
      const v = new Vector3();
      v.setFromMatrixColumn(objectMatrix, 0);
      v.multiplyScalar(-distance);
      internals.panOffset.add(v);
    },

    panUp(distance: number, objectMatrix: Matrix4) {
      const v = new Vector3();
      v.setFromMatrixColumn(objectMatrix, 1);
      v.multiplyScalar(distance);
      internals.panOffset.add(v);
    },

    pan(deltaX: number, deltaY: number) {
      if (!scope.camera) return;

      const position = scope.camera.position;
      let targetDistance = position.clone().sub(scope.target).length();

      const linearSquare = (x: number) =>
        x + (1 - Math.exp(-x / 10000)) * (x * x - x + 1 / 4);

      const distanceScale = (scope.camera as PerspectiveCamera)
        .isPerspectiveCamera
        ? (scope.camera as PerspectiveCamera).fov / 2
        : (1 / linearSquare(scope.camera.zoom)) * scope.zoomSpeed * 300;

      targetDistance *= Math.tan((distanceScale * Math.PI) / 180);

      if (height) {
        this.panLeft(
          (2 * deltaX * targetDistance) / height,
          scope.camera.matrix,
        );
        this.panUp((2 * deltaY * targetDistance) / height, scope.camera.matrix);
      }
    },

    handleTouchMovePan(event: GestureResponderEvent) {
      if (event.nativeEvent.touches.length === 1) {
        internals.panEnd.set(
          event.nativeEvent.locationX,
          event.nativeEvent.locationY,
        );
      } else if (event.nativeEvent.touches.length === 2) {
        const x =
          0.5 *
          (event.nativeEvent.touches[0].locationX +
            event.nativeEvent.touches[1].locationX);
        const y =
          0.5 *
          (event.nativeEvent.touches[0].locationY +
            event.nativeEvent.touches[1].locationY);
        internals.panEnd.set(x, y);
      } else {
        return;
      }

      internals.panDelta
        .subVectors(internals.panEnd, internals.panStart)
        .multiplyScalar(scope.panSpeed);
      this.pan(internals.panDelta.x, internals.panDelta.y);
      internals.panStart.copy(internals.panEnd);
    },

    handleTouchMoveDollyPan(event: GestureResponderEvent) {
      if (scope.enableZoom) this.handleTouchMoveDolly(event);
      if (scope.enablePan) this.handleTouchMovePan(event);
    },

    onTouchMove(event: GestureResponderEvent) {
      switch (internals.state) {
        case STATE.ROTATE:
          if (!scope.enableRotate) return;
          this.handleTouchMoveRotate(event);
          update();
          break;
        case STATE.DOLLY:
          if (!scope.enableZoom && !scope.enablePan) return;
          this.handleTouchMoveDollyPan(event);
          update();
          break;
        default:
          internals.state = STATE.NONE;
      }
    },
  };

  const MOMENTUM_EPS = 0.00001;

  const clearRotationMomentum = () => {
    internals.sphericalDelta.set(0, 0, 0);
    internals.panOffset.set(0, 0, 0);
  };

  /** Reposition the fixed-view camera and sync spherical coords — keeps drag momentum. */
  const snapCameraToFixedView = (
    viewDirection: Vector3,
    target: Vector3,
    distance: number,
  ) => {
    if (!scope.camera) return;

    internals.scale = 1;

    scope.camera.position.copy(viewDirection).multiplyScalar(distance);
    scope.camera.lookAt(target);

    const offset = new Vector3();
    const quat = new Quaternion().setFromUnitVectors(
      scope.camera.up,
      new Vector3(0, 1, 0),
    );
    const quatInverse = quat.clone().invert();
    offset.copy(scope.camera.position).sub(target);
    offset.applyQuaternion(quat);
    internals.spherical.setFromVector3(offset);
  };

  /** Full orbit reset after programmatic moves — clears stale deltas that cause zoom drift. */
  const resetOrbitToFixedView = (
    viewDirection: Vector3,
    target: Vector3,
    distance: number,
  ) => {
    clearRotationMomentum();
    snapCameraToFixedView(viewDirection, target, distance);
  };

  /** @deprecated Use snapCameraToFixedView or resetOrbitToFixedView. */
  const syncFromFixedView = resetOrbitToFixedView;

  const hasActiveMomentum = () =>
    internals.state !== STATE.NONE ||
    Math.abs(internals.sphericalDelta.theta) > MOMENTUM_EPS ||
    Math.abs(internals.sphericalDelta.phi) > MOMENTUM_EPS ||
    internals.panOffset.lengthSq() > MOMENTUM_EPS ||
    Math.abs(internals.scale - 1) > MOMENTUM_EPS;

  const isZoomInteraction = () => internals.state === STATE.DOLLY;

  const isActiveInteraction = () => internals.state !== STATE.NONE;

  const update = (() => {
    const offset = new Vector3();
    const lastPosition = new Vector3();
    const lastQuaternion = new Quaternion();
    const twoPI = 2 * Math.PI;

    return () => {
      if (!scope.camera) return;

      const position = scope.camera.position;
      const quat = new Quaternion().setFromUnitVectors(
        scope.camera.up,
        new Vector3(0, 1, 0),
      );
      const quatInverse = quat.clone().invert();

      offset.copy(position).sub(scope.target);
      offset.applyQuaternion(quat);
      internals.spherical.setFromVector3(offset);

      internals.spherical.theta +=
        internals.sphericalDelta.theta * scope.dampingFactor;
      internals.spherical.phi +=
        internals.sphericalDelta.phi * scope.dampingFactor;

      let min = scope.minAzimuthAngle;
      let max = scope.maxAzimuthAngle;

      if (isFinite(min) && isFinite(max)) {
        if (min < -Math.PI) min += twoPI;
        else if (min > Math.PI) min -= twoPI;

        if (max < -Math.PI) max += twoPI;
        else if (max > Math.PI) max -= twoPI;

        if (min <= max) {
          internals.spherical.theta = Math.max(
            min,
            Math.min(max, internals.spherical.theta),
          );
        } else {
          internals.spherical.theta =
            internals.spherical.theta > (min + max) / 2
              ? Math.max(min, internals.spherical.theta)
              : Math.min(max, internals.spherical.theta);
        }
      }

      internals.spherical.phi = Math.max(
        scope.minPolarAngle + EPSILON,
        Math.min(scope.maxPolarAngle - EPSILON, internals.spherical.phi),
      );

      if ((scope.camera as PerspectiveCamera).isPerspectiveCamera) {
        internals.spherical.radius *= internals.scale;
      } else {
        scope.camera.zoom = Math.max(
          Math.min(
            scope.camera.zoom / (internals.scale * scope.zoomSpeed),
            scope.maxZoom,
          ),
          scope.minZoom,
        );
        scope.camera.updateProjectionMatrix();
      }

      internals.spherical.radius = Math.max(
        scope.minZoom,
        Math.min(scope.maxZoom, internals.spherical.radius),
      );

      scope.target.addScaledVector(internals.panOffset, scope.dampingFactor);
      offset.setFromSpherical(internals.spherical);
      offset.applyQuaternion(quatInverse);
      position.copy(scope.target).add(offset);
      scope.camera.lookAt(scope.target);

      internals.sphericalDelta.theta *= 1 - scope.dampingFactor;
      internals.sphericalDelta.phi *= 1 - scope.dampingFactor;
      internals.panOffset.multiplyScalar(1 - scope.dampingFactor);
      internals.scale = 1;

      if (
        lastPosition.distanceToSquared(scope.camera.position) > EPSILON ||
        8 * (1 - lastQuaternion.dot(scope.camera.quaternion)) > EPSILON
      ) {
        invalidate();
        scope.onChange({ target: scope });
        lastPosition.copy(scope.camera.position);
        lastQuaternion.copy(scope.camera.quaternion);
      }
    };
  })();

  const beginInteraction = () => {
    scope.onStart();
  };

  const endInteraction = () => {
    // Carry drag intent into the R3F pointer-up that may fire after RN release.
    suppressNextTap = interactionExceededTapThreshold;
    interactionExceededTapThreshold = false;
    resetTouchState();
    scope.onEnd();
  };

  /** R3F pointer-down sync — RN responder may not run on tap-only touches. */
  const beginPointerTap = () => {
    interactionExceededTapThreshold = false;
    suppressNextTap = false;
  };

  const consumeTapThresholdExceeded = () => {
    const exceeded = interactionExceededTapThreshold || suppressNextTap;
    interactionExceededTapThreshold = false;
    suppressNextTap = false;
    return exceeded;
  };

  return {
    scope,
    functions: {
      ...functions,
      update,
      resetTouchState,
      beginPointerTap,
      consumeTapThresholdExceeded,
      syncFromFixedView,
      snapCameraToFixedView,
      resetOrbitToFixedView,
      clearRotationMomentum,
      hasActiveMomentum,
      isZoomInteraction,
      isActiveInteraction,
    },
    events: {
      onLayout(event: LayoutChangeEvent) {
        height = event.nativeEvent.layout.height;
      },
      onStartShouldSetResponder(event: GestureResponderEvent) {
        if (!scope.enabled) return false;
        beginInteraction();
        recordTouchStart(event);
        functions.onTouchStart(event);
        return true;
      },
      onMoveShouldSetResponder(event: GestureResponderEvent) {
        if (!scope.enabled) return false;
        beginInteraction();
        recordTouchStart(event);
        functions.onTouchStart(event);
        return true;
      },
      onResponderGrant(event: GestureResponderEvent) {
        recordTouchStart(event);
        functions.onTouchStart(event);
      },
      onResponderMove(event: GestureResponderEvent) {
        trackTouchMove(event);
        const touchCount = event.nativeEvent.touches.length;
        if (internals.state === STATE.ROTATE && touchCount >= 2) {
          functions.onTouchStart(event);
        } else if (internals.state === STATE.DOLLY && touchCount === 1) {
          functions.onTouchStart(event);
        }

        functions.onTouchMove(event);
      },
      onResponderRelease() {
        endInteraction();
      },
      onResponderTerminate() {
        endInteraction();
      },
      onResponderTerminationRequest() {
        return false;
      },
    },
  };
}

export type GlobeOrbitControls = ReturnType<typeof createGlobeOrbitControls>;
