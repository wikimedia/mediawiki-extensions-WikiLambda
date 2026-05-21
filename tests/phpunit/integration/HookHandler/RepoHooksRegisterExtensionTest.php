<?php

/**
 * WikiLambda integration test suite for RepoHooks::registerExtension
 *
 * Asserts that the WikiLambda user rights, group permissions, and rate limits
 * are only registered when their respective feature-mode flag is enabled, so
 * client-only wikis (e.g. Wikipedia) don't expose unused Wikifunctions groups
 * on Special:ListGroupRights, and Abstract-client wikis don't expose the
 * Abstract authoring rights. (T407066)
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\HookHandler;

use MediaWiki\Extension\WikiLambda\HookHandler\RepoHooks;
use MediaWikiIntegrationTestCase;

/**
 * @covers \MediaWiki\Extension\WikiLambda\HookHandler\RepoHooks::registerExtension
 */
class RepoHooksRegisterExtensionTest extends MediaWikiIntegrationTestCase {

	/**
	 * A repo-mode-only right granted to a logged-in user; if registerExtension
	 * fired its repo branch, this should appear in $wgAvailableRights and in
	 * the 'user' group permission map.
	 */
	private const REPO_USER_RIGHT = 'wikilambda-create-function';

	/**
	 * A repo-mode-only group that should appear in $wgGroupPermissions, in the
	 * sysop AddGroups/RemoveGroups lists, and in $wgPrivilegedGroups.
	 */
	private const REPO_PRIVILEGED_GROUP = 'functioneer';

	/**
	 * An abstract-mode-only right granted to a logged-in user.
	 */
	private const ABSTRACT_USER_RIGHT = 'wikilambda-abstract-create';

	/**
	 * Establish a known-empty baseline for every global registerExtension may
	 * touch, plus the two mode flags it reads. setMwGlobals auto-restores in
	 * tearDown so each test runs in isolation regardless of the bootstrap state.
	 *
	 * @param bool $enableRepoMode
	 * @param bool $enableAbstractMode
	 * @param array $groupPermissionOverrides Initial $wgGroupPermissions to use as a baseline
	 */
	private function primeGlobals(
		bool $enableRepoMode,
		bool $enableAbstractMode,
		array $groupPermissionOverrides = []
	): void {
		$this->setMwGlobals( [
			'wgWikiLambdaEnableRepoMode' => $enableRepoMode,
			'wgWikiLambdaEnableAbstractMode' => $enableAbstractMode,
			'wgNamespaceContentModels' => [],
			'wgNamespaceProtection' => [],
			'wgNonincludableNamespaces' => [],
			'wgAvailableRights' => [],
			'wgGroupPermissions' => $groupPermissionOverrides,
			'wgRateLimits' => [],
			'wgAddGroups' => [],
			'wgRemoveGroups' => [],
			'wgPrivilegedGroups' => [],
		] );
	}

	public static function provideModeCombinations(): array {
		return [
			// Wikifunctions: hosts the Functions repo, and may also host Abstract Wikipedia content.
			'Wikifunctions repo (repo on, abstract on)' => [
				'enableRepoMode' => true,
				'enableAbstractMode' => true,
				'expectRepoModeRights' => true,
				'expectAbstractModeRights' => true,
			],
			// Hypothetical Functions-only repo with no abstract content.
			'Functions-only repo (repo on, abstract off)' => [
				'enableRepoMode' => true,
				'enableAbstractMode' => false,
				'expectRepoModeRights' => true,
				'expectAbstractModeRights' => false,
			],
			// Abstract-content authoring wiki that calls a remote Wikifunctions repo.
			'Abstract repo only (repo off, abstract on)' => [
				'enableRepoMode' => false,
				'enableAbstractMode' => true,
				'expectRepoModeRights' => false,
				'expectAbstractModeRights' => true,
			],
			// Pure client wiki (e.g. test.wikipedia.org with WikiLambda installed for {{#function:…}}).
			'Pure client (repo off, abstract off)' => [
				'enableRepoMode' => false,
				'enableAbstractMode' => false,
				'expectRepoModeRights' => false,
				'expectAbstractModeRights' => false,
			],
		];
	}

	/**
	 * @dataProvider provideModeCombinations
	 */
	public function testRegisterExtensionGatesRightsByMode(
		bool $enableRepoMode,
		bool $enableAbstractMode,
		bool $expectRepoModeRights,
		bool $expectAbstractModeRights
	): void {
		$this->primeGlobals( $enableRepoMode, $enableAbstractMode );

		RepoHooks::registerExtension();

		global $wgAvailableRights, $wgGroupPermissions, $wgPrivilegedGroups,
			$wgAddGroups, $wgRemoveGroups, $wgRateLimits;

		if ( $expectRepoModeRights ) {
			$this->assertContains(
				self::REPO_USER_RIGHT, $wgAvailableRights,
				'Repo-mode rights must be in $wgAvailableRights when repo mode is enabled'
			);
			$this->assertSame(
				true,
				$wgGroupPermissions['user'][self::REPO_USER_RIGHT] ?? null,
				"'user' must be granted the repo-mode right when repo mode is enabled"
			);
			$this->assertArrayHasKey( self::REPO_PRIVILEGED_GROUP, $wgGroupPermissions );
			$this->assertContains( self::REPO_PRIVILEGED_GROUP, $wgPrivilegedGroups );
			$this->assertContains(
				self::REPO_PRIVILEGED_GROUP, $wgAddGroups['sysop'] ?? [],
				"Sysop should be able to grant the privileged group when repo mode is enabled"
			);
			$this->assertContains( self::REPO_PRIVILEGED_GROUP, $wgRemoveGroups['sysop'] ?? [] );
			$this->assertArrayHasKey(
				'wikilambda-execute', $wgRateLimits,
				'Repo-mode rate limits must be registered when repo mode is enabled'
			);
		} else {
			$this->assertNotContains(
				self::REPO_USER_RIGHT, $wgAvailableRights,
				'Repo-mode rights must NOT leak into client-only wikis (T407066)'
			);
			$this->assertArrayNotHasKey( self::REPO_PRIVILEGED_GROUP, $wgGroupPermissions );
			$this->assertNotContains( self::REPO_PRIVILEGED_GROUP, $wgPrivilegedGroups );
			$this->assertNotContains( self::REPO_PRIVILEGED_GROUP, $wgAddGroups['sysop'] ?? [] );
			$this->assertNotContains( self::REPO_PRIVILEGED_GROUP, $wgRemoveGroups['sysop'] ?? [] );
			$this->assertArrayNotHasKey( 'wikilambda-execute', $wgRateLimits );
		}

		if ( $expectAbstractModeRights ) {
			$this->assertContains(
				self::ABSTRACT_USER_RIGHT, $wgAvailableRights,
				'Abstract-mode rights must be in $wgAvailableRights when abstract mode is enabled'
			);
			$this->assertSame(
				true, $wgGroupPermissions['user'][self::ABSTRACT_USER_RIGHT] ?? null,
				"'user' must be granted the abstract-mode right when abstract mode is enabled"
			);
		} else {
			$this->assertNotContains(
				self::ABSTRACT_USER_RIGHT, $wgAvailableRights,
				'Abstract-mode rights must NOT leak into abstract-client wikis (T407066)'
			);
		}
	}

	/**
	 * Re-firing registerExtension (as setUpAsRepoMode() does for repo-mode integration
	 * tests) must not duplicate entries in indexed lists or change permission maps.
	 */
	public function testRegisterExtensionIsIdempotent(): void {
		$this->primeGlobals( true, true );

		RepoHooks::registerExtension();

		global $wgAvailableRights, $wgGroupPermissions, $wgPrivilegedGroups,
			$wgAddGroups, $wgRemoveGroups, $wgNonincludableNamespaces, $wgRateLimits;
		$snapshot = [
			'wgAvailableRights' => $wgAvailableRights,
			'wgGroupPermissions' => $wgGroupPermissions,
			'wgPrivilegedGroups' => $wgPrivilegedGroups,
			'wgAddGroups' => $wgAddGroups,
			'wgRemoveGroups' => $wgRemoveGroups,
			'wgNonincludableNamespaces' => $wgNonincludableNamespaces,
			'wgRateLimits' => $wgRateLimits,
		];

		RepoHooks::registerExtension();

		$this->assertSame( $snapshot['wgAvailableRights'], $wgAvailableRights );
		$this->assertSame( $snapshot['wgGroupPermissions'], $wgGroupPermissions );
		$this->assertSame( $snapshot['wgPrivilegedGroups'], $wgPrivilegedGroups );
		$this->assertSame( $snapshot['wgAddGroups'], $wgAddGroups );
		$this->assertSame( $snapshot['wgRemoveGroups'], $wgRemoveGroups );
		$this->assertSame( $snapshot['wgNonincludableNamespaces'], $wgNonincludableNamespaces );
		$this->assertSame( $snapshot['wgRateLimits'], $wgRateLimits );
	}

	/**
	 * If LocalSettings.php (or any earlier registration pass) has set a more
	 * restrictive permission, our default must NOT override it. This mirrors the
	 * merge semantics MediaWiki's ExtensionProcessor applies to extension.json
	 * GroupPermissions declarations.
	 */
	public function testRegisterExtensionPreservesLocalSettingsPermissionOverrides(): void {
		$this->primeGlobals( true, false, [
			'user' => [ self::REPO_USER_RIGHT => false ],
		] );

		RepoHooks::registerExtension();

		global $wgGroupPermissions;
		$this->assertFalse(
			$wgGroupPermissions['user'][self::REPO_USER_RIGHT],
			'Pre-existing permission set to false must win over our default true'
		);
	}
}
