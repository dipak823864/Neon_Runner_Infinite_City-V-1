import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from './GameEngine';
import { GameState, AIState } from './types';

export default function App() {
    const containerRef = useRef<HTMLDivElement>(null);
    const gameRef = useRef<GameEngine | null>(null);
    
    const [gameState, setGameState] = useState<GameState>(GameState.MENU);
    const [score, setScore] = useState(0);
    const [finalScore, setFinalScore] = useState(0);
    const [autoPilot, setAutoPilot] = useState(false);
    
    // AI Debug State
    const [aiState, setAiState] = useState<AIState>({
        enabled: false,
        currentLane: 0,
        targetLane: 0,
        action: 'SCANNING',
        confidence: 0,
        nearestThreatDist: 0,
        laneScores: [0,0,0]
    });

    useEffect(() => {
        if (!containerRef.current) return;

        const game = new GameEngine(
            containerRef.current,
            (s) => setScore(s),
            (s) => {
                setFinalScore(s);
                setGameState(GameState.GAME_OVER);
            },
            (state) => setAiState(state) // Update AI UI
        );
        gameRef.current = game;

        return () => game.cleanup();
    }, []);

    useEffect(() => {
        // Keyboard listeners
        const handleKey = (e: KeyboardEvent) => {
            if (!gameRef.current || gameState !== GameState.PLAYING) return;
            
            // Manual overrides work even in Auto Pilot (Hybrid/Smart control)
            switch(e.key) {
                case 'ArrowLeft': case 'a': gameRef.current.moveLeft(); break;
                case 'ArrowRight': case 'd': gameRef.current.moveRight(); break;
                case 'ArrowUp': case 'w': case ' ': gameRef.current.jump(); break;
                case 'ArrowDown': case 's': gameRef.current.roll(); break;
            }
        };

        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [gameState]);

    // Touch controls
    const [touchStart, setTouchStart] = useState({ x: 0, y: 0 });

    const handleTouchStart = (e: React.TouchEvent) => {
        setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (!gameRef.current || gameState !== GameState.PLAYING) return;
        
        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;
        const diffX = endX - touchStart.x;
        const diffY = endY - touchStart.y;

        if (Math.abs(diffX) > Math.abs(diffY)) {
            if (Math.abs(diffX) > 30) {
                if (diffX > 0) gameRef.current.moveRight();
                else gameRef.current.moveLeft();
            }
        } else {
            if (Math.abs(diffY) > 30) {
                if (diffY < 0) gameRef.current.jump();
                else gameRef.current.roll();
            }
        }
    };

    const startGame = () => {
        if (gameRef.current) {
            gameRef.current.start();
            setGameState(GameState.PLAYING);
        }
    };

    const toggleAutoPilot = () => {
        const newVal = !autoPilot;
        setAutoPilot(newVal);
        if (gameRef.current) {
            gameRef.current.toggleAutoPilot(newVal);
        }
    };

    // Helper for AI Lane Visualizer
    const getLaneColor = (laneIdx: number) => {
        if (laneIdx === aiState.targetLane) return 'bg-cyan-400 shadow-[0_0_10px_#0ff]';
        if (laneIdx === aiState.currentLane) return 'bg-white/50';
        return 'bg-gray-800/50';
    };
    
    // AI Reasoning Text
    const getAIReason = () => {
        if (aiState.confidence === 0) return "PANIC: EVASIVE MANEUVERS";
        if (aiState.action === 'DODGE') return "AVOIDING SOLID OBSTACLE";
        if (aiState.targetLane !== aiState.currentLane) return "OPTIMIZING PATH (COINS)";
        if (aiState.action === 'JUMP') return "DETECTED BARRIER - JUMPING";
        if (aiState.action === 'DUCK') return "DETECTED OVERHEAD - ROLLING";
        return "CRUISING";
    };

    return (
        <div 
            className="relative w-full h-screen overflow-hidden bg-black select-none"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            {/* 3D Canvas Container */}
            <div ref={containerRef} className="absolute inset-0 z-0" />

            {/* AI HUD / DEBUG OVERLAY */}
            {gameState === GameState.PLAYING && autoPilot && (
                <div className="absolute top-24 left-6 z-10 w-72 pointer-events-none font-mono text-xs">
                    <div className={`bg-black/80 border backdrop-blur-md p-4 rounded-lg relative overflow-hidden shadow-lg transition-colors duration-300 ${aiState.confidence < 50 ? 'border-red-500/50' : 'border-cyan-500/30 text-cyan-100'}`}>
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent animate-pulse opacity-50"></div>
                        
                        <div className="flex justify-between items-center mb-3">
                            <span className="font-bold tracking-widest text-cyan-400">AI NEURAL NET</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${aiState.confidence > 80 ? 'bg-green-500/20 text-green-400' : (aiState.confidence > 40 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400')}`}>
                                {aiState.confidence}% CONFIDENCE
                            </span>
                        </div>

                        <div className="space-y-1 mb-4">
                            <div className="flex justify-between">
                                <span className="text-gray-400">STATUS</span>
                                <span className={`font-bold ${aiState.action === 'DODGE' ? 'text-orange-400' : 'text-white'}`}>
                                    {getAIReason()}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">NEXT ACTION</span>
                                <span className="font-bold text-white">{aiState.action}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">THREAT DIST</span>
                                <span className="font-mono text-cyan-200">{aiState.nearestThreatDist < 9000 ? aiState.nearestThreatDist.toFixed(1) + 'm' : 'CLEAR'}</span>
                            </div>
                        </div>

                        {/* Lane Viz */}
                        <div className="flex gap-2 h-24 items-end justify-center pb-1 border-t border-white/10 pt-2">
                            {[-1, 0, 1].map((lane, idx) => {
                                const score = aiState.laneScores[idx] || 0;
                                // Normalize score for display (rough approximation since scores can be negative)
                                const heightPercent = Math.max(10, Math.min(100, (score + 100) / 2));
                                
                                return (
                                    <div key={lane} className="w-12 relative flex flex-col items-center group">
                                        <span className="text-[9px] text-gray-400 mb-1 z-20 font-bold">{score > -9000 ? score : 'DEAD'}</span>
                                        {/* Score bar height viz */}
                                        <div 
                                            className={`absolute bottom-6 w-full z-0 rounded-t-sm transition-all duration-300 ${score < -100 ? 'bg-red-900/40' : 'bg-cyan-900/40'}`}
                                            style={{ height: `${heightPercent}%` }}
                                        ></div>
                                        
                                        {/* Lane Indicator */}
                                        <div className={`w-3 h-full rounded-full transition-all duration-300 z-10 ${getLaneColor(lane)} ${lane === aiState.targetLane ? 'h-12 scale-110' : 'h-8'}`}></div>
                                        
                                        <span className="text-[9px] text-gray-500 mt-1 z-10">L{lane}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* HUD */}
            <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start pointer-events-none z-10">
                <div className="flex flex-col gap-2">
                    <h1 className="text-2xl font-bold text-white neon-text opacity-80 tracking-widest">NEON RUNNER</h1>
                    {gameState === GameState.PLAYING && (
                         <div className={`pointer-events-auto flex items-center gap-2 border bg-black/40 backdrop-blur px-4 py-2 rounded-full transition-all duration-500 ${autoPilot ? 'shadow-[0_0_25px_rgba(0,255,255,0.6)] border-cyan-400' : 'opacity-60 border-gray-600'}`}>
                            <div className={`w-3 h-3 rounded-full ${autoPilot ? 'bg-cyan-400 animate-pulse shadow-[0_0_15px_#0ff]' : 'bg-gray-600'}`} />
                            <button 
                                onClick={toggleAutoPilot}
                                className="text-cyan-400 font-bold text-sm tracking-widest hover:text-white transition-colors"
                            >
                                {autoPilot ? 'AUTO-PILOT ACTIVE' : 'ENGAGE AUTO-PILOT'}
                            </button>
                         </div>
                    )}
                </div>

                <div className="text-right">
                    <div className="text-cyan-400 text-sm font-bold tracking-widest neon-text">SCORE</div>
                    <div className="text-4xl font-black text-white neon-text">{score.toString().padStart(6, '0')}</div>
                </div>
            </div>

            {/* Menus */}
            {gameState === GameState.MENU && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm z-20">
                    <h1 className="text-6xl md:text-8xl font-black text-white mb-2 neon-text tracking-tighter italic transform -skew-x-12">
                        NEON<span className="text-pink-500 neon-text-pink">RUNNER</span>
                    </h1>
                    <p className="text-cyan-200 mb-8 text-lg tracking-widest opacity-80">INFINITE CITY PROTOCOL</p>
                    
                    <button 
                        onClick={startGame}
                        className="group relative px-12 py-4 bg-transparent overflow-hidden rounded-full border border-cyan-500 hover:border-pink-500 transition-colors duration-300"
                    >
                        <div className="absolute inset-0 w-full h-full bg-cyan-500/20 group-hover:bg-pink-500/20 transition-colors duration-300 blur-md"></div>
                        <span className="relative text-2xl font-bold text-white tracking-widest group-hover:neon-text-pink">INITIATE RUN</span>
                    </button>

                    <div className="mt-12 flex gap-4 text-gray-500 text-sm">
                        <span className="border border-gray-700 px-3 py-1 rounded">WASD / ARROWS</span>
                        <span className="border border-gray-700 px-3 py-1 rounded">SPACE TO JUMP</span>
                        <span className="border border-gray-700 px-3 py-1 rounded">SWIPE TO MOVE</span>
                    </div>
                </div>
            )}

            {gameState === GameState.GAME_OVER && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/40 backdrop-blur-md z-20">
                    <h2 className="text-7xl font-black text-red-500 mb-4 shadow-red-500 drop-shadow-[0_0_30px_rgba(255,0,0,0.8)] italic">CRASHED</h2>
                    <div className="text-white text-2xl mb-8">
                        FINAL SCORE: <span className="text-yellow-400 font-mono font-bold">{finalScore}</span>
                    </div>
                    <button 
                        onClick={startGame}
                        className="px-10 py-3 bg-white text-black font-bold text-xl rounded-full hover:bg-cyan-400 hover:scale-105 transition-all shadow-[0_0_20px_rgba(255,255,255,0.4)]"
                    >
                        RETRY
                    </button>
                </div>
            )}
            
            {/* Mobile Controls Hint (Visible only when playing) */}
            {gameState === GameState.PLAYING && (
                <div className="absolute bottom-8 w-full text-center text-white/30 text-xs pointer-events-none md:hidden">
                    SWIPE TO CONTROL
                </div>
            )}
        </div>
    );
}