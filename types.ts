import * as THREE from 'three';

export enum GameState {
    MENU = 'MENU',
    PLAYING = 'PLAYING',
    GAME_OVER = 'GAME_OVER'
}

export enum CollisionType {
    SOLID = 'solid',
    JUMP = 'jump',
    DUCK = 'duck',
    COIN = 'coin'
}

export interface GameConfig {
    laneWidth: number;
    startSpeed: number;
    maxSpeed: number;
    speedIncrement: number;
    jumpForce: number;
    gravity: number;
    visibilityRange: number;
    fogDensity: number;
}

export interface PlayerState {
    lane: number;
    isJumping: boolean;
    isRolling: boolean;
    velocityY: number;
}

export interface AIState {
    enabled: boolean;
    currentLane: number;
    targetLane: number;
    action: 'RUN' | 'JUMP' | 'DUCK' | 'DODGE' | 'SCANNING';
    confidence: number; // 0-100
    nearestThreatDist: number;
    laneScores: number[];
}