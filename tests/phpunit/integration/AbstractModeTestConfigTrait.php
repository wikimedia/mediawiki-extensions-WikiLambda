<?php

/**
 * WikiLambda test trait to configure a wiki that hosts Abstract Wikipedia
 * content in a test abstract namespace.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\HookHandler\RepoHooks;
use MediaWiki\MainConfigNames;

trait AbstractModeTestConfigTrait {

	/**
	 * The abstract namespace these tests host content in, matching the
	 * WikiLambdaAbstractNamespaces default in extension.json. Tests refer to the
	 * same ID through their own TEST_ABSTRACT_NS constant.
	 */
	private const ABSTRACT_NS = 2300;
	private const ABSTRACT_NS_NAME = 'Abstract_Wikipedia';
	private const ABSTRACT_NS_QID = 'Q50081413';

	/**
	 * Configure the test environment as an Abstract Wikipedia repo, hosting abstract
	 * content in namespace 2300. This is the same as default for the repo, but not
	 * how the code is used on abstract.wikipedia.org.
	 */
	protected function setUpAsAbstractMode(): void {
		$config = $this->getServiceContainer()->getMainConfig();

		$this->overrideConfigValues( [
			'WikiLambdaEnableAbstractMode' => true,
			// canBeUsedOn() gates on this map, so the test namespace must be a key.
			'WikiLambdaAbstractNamespaces' =>
				[ self::ABSTRACT_NS => [ self::ABSTRACT_NS_NAME, self::ABSTRACT_NS_QID ] ]
				+ $config->get( 'WikiLambdaAbstractNamespaces' ),
			MainConfigNames::ExtraNamespaces =>
				[
					self::ABSTRACT_NS => self::ABSTRACT_NS_NAME,
					self::ABSTRACT_NS + 1 => self::ABSTRACT_NS_NAME . '_talk',
				]
				+ $config->get( MainConfigNames::ExtraNamespaces ),
			MainConfigNames::NamespaceContentModels =>
				[ self::ABSTRACT_NS => CONTENT_MODEL_ABSTRACT ]
				+ $config->get( MainConfigNames::NamespaceContentModels ),
			MainConfigNames::NamespaceProtection =>
				[ self::ABSTRACT_NS => [ 'wikilambda-abstract-edit', 'wikilambda-abstract-create' ] ]
				+ $config->get( MainConfigNames::NamespaceProtection ),
			MainConfigNames::ContentNamespaces => array_values( array_unique(
				array_merge( $config->get( MainConfigNames::ContentNamespaces ), [ self::ABSTRACT_NS ] )
			) ),
		] );

		$this->setMwGlobals( 'wgWikiLambdaEnableAbstractMode', true );
		RepoHooks::registerExtension();
	}
}
