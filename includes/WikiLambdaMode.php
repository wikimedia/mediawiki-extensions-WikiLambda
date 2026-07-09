<?php
/**
 * WikiLambda feature-mode value object
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

use MediaWiki\Config\Config;

/**
 * Resolves WikiLambda's independently-toggled feature modes once, from config,
 * and answers "which mode am I in?" behind a small interface.
 *
 * This is the single seam for the ~75 runtime mode checks that were previously
 * raw `$config->get( 'WikiLambdaEnable…' )` reads scattered across four
 * inconsistent access paths. It deliberately does NOT cover the two
 * extension-bootstrap gating sites — RepoHooks::registerExtension() (which runs
 * before the service container and reads $wg globals) and the
 * LoadExtensionSchemaUpdates installer blocks (has()-guarded, pre-registry) —
 * as those are structural registration, not runtime predicate reads.
 *
 * The flags are fixed for the lifetime of a request, so they are read once at
 * construction and the object is immutable thereafter.
 */
class WikiLambdaMode {

	private bool $repo;
	private bool $client;
	private bool $clientOffline;
	private bool $abstract;
	private bool $abstractClient;
	private bool $abstractClientIntegration;

	public function __construct( Config $config ) {
		$this->repo = self::readFlag( $config, 'WikiLambdaEnableRepoMode' );
		$this->client = self::readFlag( $config, 'WikiLambdaEnableClientMode' );
		$this->clientOffline = self::readFlag( $config, 'WikiLambdaClientModeOffline' );
		$this->abstract = self::readFlag( $config, 'WikiLambdaEnableAbstractMode' );
		$this->abstractClient = self::readFlag( $config, 'WikiLambdaEnableAbstractClientMode' );
		$this->abstractClientIntegration = self::readFlag( $config, 'WikiLambdaEnableAbstractClientModeIntegration' );
	}

	/**
	 * Read a boolean mode flag, treating an absent key as false (fail-closed: a
	 * mode that isn't configured is off). In production during normal operations,
	 * every flag is at least its extension.json default or over-ridden, so the
	 * key is always present; the has() guard is for partial Configs (e.g. a
	 * HashConfig in a test) and mirrors the defensive config-presence checks used
	 * elsewhere in the extension for e.g. very early reads during MediaWiki's
	 * start-up.
	 */
	private static function readFlag( Config $config, string $key ): bool {
		return $config->has( $key ) && (bool)$config->get( $key );
	}

	/**
	 * Repo mode: this wiki hosts ZObjects in the main namespace (Wikifunctions).
	 * The DB-backed ZObjectStore exists only when this is true.
	 */
	public function isRepo(): bool {
		return $this->repo;
	}

	/**
	 * Client mode: this wiki calls a remote Wikifunctions repo via {{#function:…}}.
	 */
	public function isClient(): bool {
		return $this->client;
	}

	/**
	 * Client-offline modifier: emit cached/disabled state instead of running new
	 * function calls. Only meaningful inside client-mode code paths.
	 */
	public function isClientOffline(): bool {
		return $this->clientOffline;
	}

	/**
	 * Abstract mode: this wiki hosts Abstract Wikipedia content (an Abstract Repo).
	 */
	public function isAbstract(): bool {
		return $this->abstract;
	}

	/**
	 * Abstract Client mode: this wiki displays rendered Abstract Articles in place
	 * of missing local ones (an Abstract Client).
	 */
	public function isAbstractClient(): bool {
		return $this->abstractClient;
	}

	/**
	 * Whether Abstract Client integration is actually live. The integration flag
	 * is a kill-switch that is meaningless unless Abstract Client mode is also on,
	 * so it is only ever the two AND-ed together.
	 */
	public function isAbstractClientIntegration(): bool {
		return $this->abstractClient && $this->abstractClientIntegration;
	}

	/**
	 * Whether repo or abstract mode is on — the union used by the page-rendering
	 * hooks to decide whether a request concerns a locally-hosted ZObject or
	 * Abstract Article at all. (Client modes render content too, but do not host
	 * it, so they are deliberately excluded here.)
	 */
	public function isRepoOrAbstract(): bool {
		return $this->repo || $this->abstract;
	}
}
