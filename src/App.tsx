import React, { useCallback, useEffect, useRef, useState } from 'react';
import { mapEventsToAnimationSteps } from './animation/animationManager';
import type { AnimationStep } from './animation/animationTypes';
import { soundEngine } from './audio/soundEngine';
import { CARD_CATALOG_BY_ID } from './catalog/cards';
import type { FamilyId } from './catalog/types';
import { CollectionScreen } from './components/CollectionScreen';
import { GameTableScreen } from './components/GameTableScreen';
import { RulesScreen } from './components/RulesScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { SoloSetupScreen } from './components/SoloSetupScreen';
import { StatsScreen } from './components/StatsScreen';
import {
  extractTableChoreography,
  type ActiveSpecialChoreography,
  type CardFlightSpec,
} from './components/table/specialAnimationCatalog';
import { TitleScreen } from './components/TitleScreen';
import { NexusUiProvider } from './components/ui/NexusUiContext';
import type { GameEvent, PlayerView } from './engine/gameTypes';
import {
  applyMatchOutcomeToProgression,
  createInitialProgressionStats,
  loadProgressionStats,
  loadSettings,
  saveProgressionStats,
  saveSettings,
} from './progression/progressionStore';
import {
  createDefaultSoloSetup,
  HUMAN_PLAYER_ID,
  SoloSessionHost,
} from './solo/soloSession';
import type {
  AchievementDefinition,
  AppScreen,
  NexusProgressionStats,
  NexusSettings,
  SoloMatchSetup,
} from './types/app';
import { formatPublicEventsForFeed } from './utils/eventFormatter';

function shouldAutostartFromQuery(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.get('autostart') === '1';
}

function triggerSoundsForEvents(events: readonly GameEvent[], humanId: string): void {
  for (const ev of events) {
    switch (ev.type) {
      case 'CARD_PLAYED': {
        const model = CARD_CATALOG_BY_ID[ev.payload.card.variantId];
        if (model.kind === 'FAMILY_SPECIAL') {
          if (model.specialCategory === 'IMPULSION') soundEngine.play('IMPULSION', model.family);
          else if (model.specialCategory === 'INVERSION') soundEngine.play('INVERSION', model.family);
          else soundEngine.play('BOUCLIER', model.family);
        } else if (model.kind === 'UNIVERSAL_SPECIAL') {
          if (model.specialCategory === 'SURCHARGE') soundEngine.play('SURCHARGE');
          else soundEngine.play('PORTAIL');
        } else {
          soundEngine.play('CARD_PLAY', model.family);
        }
        break;
      }
      case 'CARD_DRAWN':
        if (!ev.payload.isPenalty) {
          soundEngine.play('CARD_DRAW');
        }
        break;
      case 'PORTAL_RESONANCE':
        soundEngine.play('PORTAIL', ev.payload.chosenFamily);
        break;
      case 'NEXUS_DECLARED':
        soundEngine.play('NEXUS_CALL');
        break;
      case 'GAME_OVER':
        soundEngine.play(ev.payload.winners.includes(humanId) ? 'VICTORY' : 'DEFEAT');
        break;
      default:
        break;
    }
  }
}

export default function App(): React.ReactElement {
  const [settings, setSettings] = useState<NexusSettings>(() => loadSettings());
  const [stats, setStats] = useState<NexusProgressionStats>(() => loadProgressionStats());
  const [setup, setSetup] = useState<SoloMatchSetup>(() => createDefaultSoloSetup());
  const [screen, setScreen] = useState<AppScreen>(() =>
    shouldAutostartFromQuery() ? 'TABLE' : 'TITLE',
  );
  const [paused, setPaused] = useState(false);

  const sessionRef = useRef<SoloSessionHost | null>(null);
  const recordedGameIdsRef = useRef<Set<string>>(new Set());

  const [humanView, setHumanView] = useState<PlayerView | null>(() => {
    if (!shouldAutostartFromQuery()) return null;
    const host = new SoloSessionHost(createDefaultSoloSetup());
    sessionRef.current = host;
    return host.getHumanView();
  });

  const [actionLog, setActionLog] = useState<readonly string[]>([]);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);
  const [newlyUnlocked, setNewlyUnlocked] = useState<readonly AchievementDefinition[]>([]);
  const [turnsPlayed, setTurnsPlayed] = useState(0);

  const [animQueue, setAnimQueue] = useState<readonly AnimationStep[]>([]);
  const [activeAnimationStep, setActiveAnimationStep] = useState<AnimationStep | null>(null);

  const [flightQueue, setFlightQueue] = useState<readonly CardFlightSpec[]>([]);
  const [activeFlight, setActiveFlight] = useState<CardFlightSpec | null>(null);
  const [specialQueue, setSpecialQueue] = useState<readonly ActiveSpecialChoreography[]>([]);
  const [activeSpecialChoreography, setActiveSpecialChoreography] =
    useState<ActiveSpecialChoreography | null>(null);
  const [numericPulseKey, setNumericPulseKey] = useState<string | null>(null);
  const [landingPulseKey, setLandingPulseKey] = useState<string | null>(null);

  // Sync audio configuration
  useEffect(() => {
    soundEngine.configure({
      muted: settings.soundMuted,
      volume: settings.soundVolume,
    });
    saveSettings(settings);
  }, [settings]);

  // Clear animation queue immediately if user switches to OFF
  useEffect(() => {
    if (settings.animationLevel === 'OFF') {
      setAnimQueue([]);
      setActiveAnimationStep(null);
      setFlightQueue([]);
      setActiveFlight(null);
      setSpecialQueue([]);
      setActiveSpecialChoreography(null);
      setNumericPulseKey(null);
      setLandingPulseKey(null);
    }
  }, [settings.animationLevel]);

  // Sync document.body.dataset.state
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (screen !== 'TABLE') {
      document.body.dataset.state = 'title';
      return;
    }
    if (humanView?.phase === 'GAME_OVER') {
      document.body.dataset.state = 'gameover';
      return;
    }
    document.body.dataset.state = paused ? 'paused' : 'playing';
  }, [screen, paused, humanView?.phase]);

  const enqueueEventsFeedback = useCallback(
    (events: readonly GameEvent[], view: PlayerView) => {
      if (events.length === 0) return;

      triggerSoundsForEvents(events, view.self.id);

      const formatted = formatPublicEventsForFeed(events, view);
      if (formatted.length > 0) {
        setActionLog((prev) => [...[...formatted].reverse(), ...prev].slice(0, 12));
      }

      if (settings.animationLevel !== 'OFF') {
        const steps = mapEventsToAnimationSteps(events, settings.animationLevel);
        if (steps.length > 0) {
          setAnimQueue((prev) => [...prev, ...steps]);
        }

        const choreo = extractTableChoreography(events, settings.animationLevel);
        if (choreo.flights.length > 0) {
          setFlightQueue((prev) => [...prev, ...choreo.flights]);
        }
        if (choreo.specials.length > 0) {
          setSpecialQueue((prev) => [...prev, ...choreo.specials]);
        }
        if (choreo.numericPulseFamily) {
          setNumericPulseKey(`${choreo.numericPulseFamily}-${Date.now()}`);
        }
      }
    },
    [settings.animationLevel],
  );

  // Run initial GAME_STARTED feedback when autostart=1 boots directly into TABLE
  useEffect(() => {
    if (screen === 'TABLE' && sessionRef.current && humanView) {
      const initialEvents = sessionRef.current.consumeInitialEvents();
      if (initialEvents.length > 0) {
        enqueueEventsFeedback(initialEvents, humanView);
      }
    }
  }, [screen, humanView, enqueueEventsFeedback]);

  // Process animation queue without slowing down the engine
  useEffect(() => {
    if (settings.animationLevel === 'OFF') {
      return;
    }
    if (activeAnimationStep !== null || animQueue.length === 0) {
      return;
    }
    const [next, ...rest] = animQueue;
    setActiveAnimationStep(next);
    setAnimQueue(rest);
  }, [animQueue, activeAnimationStep, settings.animationLevel]);

  useEffect(() => {
    if (!activeAnimationStep) return;
    const timer = window.setTimeout(() => {
      setActiveAnimationStep(null);
    }, activeAnimationStep.durationMs);
    return () => window.clearTimeout(timer);
  }, [activeAnimationStep]);

  // Process visual card flights without slowing down the engine
  useEffect(() => {
    if (settings.animationLevel === 'OFF') return;
    if (activeFlight !== null || flightQueue.length === 0) return;
    const [next, ...rest] = flightQueue;
    setActiveFlight(next);
    setFlightQueue(rest);
  }, [flightQueue, activeFlight, settings.animationLevel]);

  useEffect(() => {
    if (!activeFlight) return;
    const timer = window.setTimeout(() => {
      if (activeFlight.kind === 'PLAY') {
        setLandingPulseKey(activeFlight.id);
      }
      setActiveFlight(null);
    }, activeFlight.durationMs);
    return () => window.clearTimeout(timer);
  }, [activeFlight]);

  // Process 20-signature special choreographies without slowing down the engine
  useEffect(() => {
    if (settings.animationLevel === 'OFF') return;
    if (activeSpecialChoreography !== null || specialQueue.length === 0) return;
    const [next, ...rest] = specialQueue;
    setActiveSpecialChoreography(next);
    setSpecialQueue(rest);
  }, [specialQueue, activeSpecialChoreography, settings.animationLevel]);

  useEffect(() => {
    if (!activeSpecialChoreography) return;
    const timer = window.setTimeout(() => {
      setActiveSpecialChoreography(null);
    }, activeSpecialChoreography.durationMs);
    return () => window.clearTimeout(timer);
  }, [activeSpecialChoreography]);

  const startSoloMatch = useCallback(
    (matchSetup: SoloMatchSetup = setup) => {
      if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      const host = new SoloSessionHost(matchSetup);
      sessionRef.current = host;
      const view = host.getHumanView();
      const initialEvents = host.consumeInitialEvents();

      setHumanView(view);
      setPaused(false);
      setScreen('TABLE');
      setActionLog([]);
      setStatusFeedback(null);
      setNewlyUnlocked([]);
      setTurnsPlayed(0);
      setAnimQueue([]);
      setActiveAnimationStep(null);
      setFlightQueue([]);
      setActiveFlight(null);
      setSpecialQueue([]);
      setActiveSpecialChoreography(null);
      setNumericPulseKey(null);
      setLandingPulseKey(null);

      enqueueEventsFeedback(initialEvents, view);
    },
    [setup, enqueueEventsFeedback],
  );

  const handleEngineOutcome = useCallback(
    (
      outcome: ReturnType<SoloSessionHost['dispatchHumanAction']>,
      host: SoloSessionHost,
    ) => {
      if (!outcome.ok) {
        setStatusFeedback(outcome.errorMessage ?? 'Action non autorisée');
        return;
      }

      setStatusFeedback(null);
      setHumanView(outcome.view);
      setTurnsPlayed(host.getMetricsSnapshot().turnsPlayed);
      enqueueEventsFeedback(outcome.publicEventsForHuman, outcome.view);

      if (
        outcome.view.phase === 'GAME_OVER' &&
        !recordedGameIdsRef.current.has(outcome.view.gameId)
      ) {
        recordedGameIdsRef.current.add(outcome.view.gameId);
        const metrics = host.getMetricsSnapshot();
        const won = outcome.view.winners.includes(outcome.view.self.id);
        setStats((prev) => {
          const { next, newlyUnlocked: unlocked } = applyMatchOutcomeToProgression(prev, {
            won,
            difficulty: metrics.primaryDifficulty,
            turnsPlayed: metrics.turnsPlayed,
            humanCardsPlayed: metrics.humanCardsPlayed,
            humanSpecialCardsPlayed: metrics.humanSpecialCardsPlayed,
            humanNexusDeclarations: metrics.humanNexusDeclarations,
            humanMissedNexusCaught: metrics.humanMissedNexusCaught,
            familiesUsed: metrics.familiesUsed,
            variantsUsed: metrics.variantsUsed,
            endReason: outcome.view.endReason,
          });
          saveProgressionStats(next);
          setNewlyUnlocked(unlocked);
          return next;
        });
      }
    },
    [enqueueEventsFeedback],
  );

  // Automatic Solo AI turn loop
  useEffect(() => {
    if (screen !== 'TABLE' || paused || !humanView || humanView.phase === 'GAME_OVER') {
      return;
    }
    const host = sessionRef.current;
    if (!host) return;

    const aiHasTurn = humanView.activePlayerId !== humanView.self.id;
    const aiCanActOutOfTurn =
      humanView.nexusVulnerable &&
      humanView.pendingNexusDeclarationBy !== null &&
      humanView.pendingNexusDeclarationBy !== humanView.self.id;
    const aiCanCatchHuman =
      humanView.nexusVulnerable && humanView.pendingNexusDeclarationBy === humanView.self.id;

    if (!aiHasTurn && !aiCanActOutOfTurn && !aiCanCatchHuman) {
      return;
    }

    const baseDelay =
      settings.aiPacing === 'FAST' ? 280 : settings.animationLevel === 'OFF' ? 320 : 650;

    const timer = window.setTimeout(() => {
      const currentHost = sessionRef.current;
      if (!currentHost) return;
      const aiOutcome = currentHost.stepNextAiAction();
      if (aiOutcome) {
        handleEngineOutcome(aiOutcome, currentHost);
      }
    }, baseDelay);

    return () => window.clearTimeout(timer);
  }, [screen, paused, humanView, settings.aiPacing, settings.animationLevel, handleEngineOutcome]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);
      if (isInput) return;

      if (screen === 'TITLE' && (e.key === 'Enter' || e.key === ' ')) {
        if (target?.tagName === 'BUTTON') return;
        e.preventDefault();
        startSoloMatch();
        return;
      }

      if (e.key === 'm' || e.key === 'M') {
        setSettings((prev) => ({ ...prev, soundMuted: !prev.soundMuted }));
        return;
      }

      if (
        screen === 'TABLE' &&
        humanView?.phase !== 'GAME_OVER' &&
        (e.key === 'Escape' || e.key === 'p' || e.key === 'P')
      ) {
        e.preventDefault();
        setPaused((prev) => !prev);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [screen, humanView?.phase, startSoloMatch]);

  const handlePlayCard = (cardInstanceId: string) => {
    const host = sessionRef.current;
    if (!host) return;
    const outcome = host.dispatchHumanAction({
      type: 'PLAY_CARD',
      playerId: HUMAN_PLAYER_ID,
      cardInstanceId,
    });
    handleEngineOutcome(outcome, host);
  };

  const handleDrawCard = () => {
    const host = sessionRef.current;
    if (!host) return;
    const outcome = host.dispatchHumanAction({
      type: 'DRAW_CARD',
      playerId: HUMAN_PLAYER_ID,
    });
    handleEngineOutcome(outcome, host);
  };

  const handleChooseFamily = (family: FamilyId) => {
    const host = sessionRef.current;
    if (!host) return;
    const outcome = host.dispatchHumanAction({
      type: 'CHOOSE_FAMILY',
      playerId: HUMAN_PLAYER_ID,
      family,
    });
    handleEngineOutcome(outcome, host);
  };

  const handleDeclareNexus = () => {
    const host = sessionRef.current;
    if (!host) return;
    const outcome = host.dispatchHumanAction({
      type: 'DECLARE_NEXUS',
      playerId: HUMAN_PLAYER_ID,
    });
    handleEngineOutcome(outcome, host);
  };

  const handleReportMissedNexus = () => {
    const host = sessionRef.current;
    if (!host) return;
    const outcome = host.dispatchHumanAction({
      type: 'REPORT_MISSED_NEXUS',
      reporterId: HUMAN_PLAYER_ID,
      targetPlayerId: humanView?.pendingNexusDeclarationBy ?? undefined,
    });
    handleEngineOutcome(outcome, host);
  };

  const handleResetProgression = () => {
    const fresh = createInitialProgressionStats();
    setStats(fresh);
    saveProgressionStats(fresh);
  };

  const screenTransitionClass =
    settings.animationLevel === 'FULL'
      ? 'nexus-screen-transition-full'
      : settings.animationLevel === 'REDUCED'
        ? 'nexus-screen-transition-reduced'
        : '';

  let activeView: React.ReactElement;

  if (screen === 'TABLE' && humanView) {
    activeView = (
      <GameTableScreen
        view={humanView}
        settings={settings}
        paused={paused}
        activeAnimationStep={activeAnimationStep}
        activeFlight={activeFlight}
        activeSpecialChoreography={activeSpecialChoreography}
        numericPulseKey={numericPulseKey}
        landingPulseKey={landingPulseKey}
        actionLog={actionLog}
        statusFeedback={statusFeedback}
        newlyUnlockedAchievements={newlyUnlocked}
        turnsPlayed={turnsPlayed}
        onPlayCard={handlePlayCard}
        onDrawCard={handleDrawCard}
        onChooseFamily={handleChooseFamily}
        onDeclareNexus={handleDeclareNexus}
        onReportMissedNexus={handleReportMissedNexus}
        onTogglePause={() => setPaused((prev) => !prev)}
        onRestartMatch={() => startSoloMatch(setup)}
        onToggleMute={() =>
          setSettings((prev) => ({ ...prev, soundMuted: !prev.soundMuted }))
        }
        onNavigate={(nextScreen) => {
          soundEngine.play('UI_CLICK');
          if (nextScreen !== 'TABLE') {
            setPaused(true);
          }
          setScreen(nextScreen);
        }}
      />
    );
  } else if (screen === 'SOLO_SETUP') {
    activeView = (
      <SoloSetupScreen
        setup={setup}
        onChangeSetup={setSetup}
        onStartMatch={() => startSoloMatch(setup)}
        onNavigate={(next) => {
          soundEngine.play('UI_CLICK');
          setScreen(next);
        }}
      />
    );
  } else if (screen === 'SETTINGS') {
    activeView = (
      <SettingsScreen
        settings={settings}
        onUpdateSettings={setSettings}
        onResetProgression={handleResetProgression}
        onNavigate={(next) => {
          soundEngine.play('UI_CLICK');
          if (next === 'TABLE') setPaused(false);
          setScreen(next);
        }}
        returnToTableAvailable={humanView !== null}
      />
    );
  } else if (screen === 'RULES') {
    activeView = (
      <RulesScreen
        onNavigate={(next) => {
          soundEngine.play('UI_CLICK');
          if (next === 'TABLE') setPaused(false);
          setScreen(next);
        }}
        returnToTableAvailable={humanView !== null}
      />
    );
  } else if (screen === 'COLLECTION') {
    activeView = (
      <CollectionScreen
        glowEnabled={settings.glowEnabled}
        stats={stats}
        onToggleGlow={() =>
          setSettings((prev) => ({ ...prev, glowEnabled: !prev.glowEnabled }))
        }
        onNavigate={(next) => {
          soundEngine.play('UI_CLICK');
          setScreen(next);
        }}
      />
    );
  } else if (screen === 'STATS') {
    activeView = (
      <StatsScreen
        stats={stats}
        onNavigate={(next) => {
          soundEngine.play('UI_CLICK');
          setScreen(next);
        }}
      />
    );
  } else {
    activeView = (
      <TitleScreen
        glowEnabled={settings.glowEnabled}
        stats={stats}
        onQuickStartSolo={() => startSoloMatch(setup)}
        onNavigate={(next) => {
          soundEngine.play('UI_CLICK');
          setScreen(next);
        }}
      />
    );
  }

  return (
    <NexusUiProvider
      value={{
        animationLevel: settings.animationLevel,
        glowEnabled: settings.glowEnabled,
        tableTheme: settings.tableTheme,
      }}
    >
      <div key={screen} className={screenTransitionClass}>
        {activeView}
      </div>
    </NexusUiProvider>
  );
}
