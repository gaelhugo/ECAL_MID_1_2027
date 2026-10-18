/**
 * Chargé dans l'aperçu en mode three.js : expose la bibliothèque dans
 * l'objet global THREE (comme l'ancienne version « script »), avec OrbitControls.
 * Vite en fait un seul fichier autonome (import « ?worker&url » dans modes.js).
 */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

window.THREE = { ...THREE, OrbitControls };
