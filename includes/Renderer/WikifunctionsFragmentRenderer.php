<?php

/**
 * WikiLambda HTML fragment renderer with URL policy enforcement
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Renderer;

use MediaWiki\Config\Config;
use MediaWiki\Extension\AbuseFilter\AbuseFilterServices;
use MediaWiki\Registration\ExtensionRegistry;
use MediaWiki\User\UserFactory;
use Psr\Log\LoggerInterface;

class WikifunctionsFragmentRenderer {

	public function __construct(
		private readonly LoggerInterface $logger,
		private readonly UserFactory $userFactory,
		private readonly Config $config,
		private readonly WikifunctionsFragmentImageRenderer $imageRenderer
	) {
	}

	/**
	 * Render an HTML fragment safely.
	 *
	 * The fragment is sanitised in a single Remex pass. Custom <ext-wikilambda-image>
	 * elements are recognised, validated and expanded to trusted <figure> HTML inside that
	 * pass by WikifunctionsSanitiserTokenHandler, so <figure>/<img> never need to join the
	 * sanitiser's allowed-element list and no string-level extraction round-trip is required.
	 *
	 * @param string $html Raw HTML fragment from a Wikifunctions function
	 * @return string Sanitised HTML with image elements expanded to trusted HTML
	 */
	public function render( string $html ): string {
		return $this->sanitiseFragment( $html );
	}

	/**
	 * Run the HTML sanitiser on the raw fragment, expanding image elements within the pass.
	 *
	 * @param string $html
	 * @return string
	 */
	private function sanitiseFragment( string $html ): string {
		$blockedDomains = $this->loadBlockedDomains();
		$spamCheckUser = null;
		if ( ExtensionRegistry::getInstance()->isLoaded( 'SpamBlacklist' ) ) {
			$spamCheckUser = $this->userFactory->newAnonymous();
		}

		return WikifunctionsSanitiserTokenHandler::sanitiseHtmlFragment(
			$this->logger,
			$html,
			$blockedDomains,
			$spamCheckUser,
			$this->imageRenderer
		);
	}

	/**
	 * Load the blocked domain map from AbuseFilter's BlockedExternalDomains feature.
	 *
	 * @return array<string, true>
	 */
	private function loadBlockedDomains(): array {
		if (
			ExtensionRegistry::getInstance()->isLoaded( 'Abuse Filter' ) &&
			$this->config->get( 'AbuseFilterEnableBlockedExternalDomain' )
		) {
			return AbuseFilterServices::getBlockedDomainStorage()->loadComputed();
		}
		return [];
	}
}
