<!--
	WikiLambda Vue component for displaying how widely a Function is used:
	how many pages call it, and from how many wikis.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<wl-widget-base
		class="ext-wikilambda-app-function-usage-widget"
		data-testid="function-usage-widget"
	>
		<!-- Widget header -->
		<template #header>
			{{ i18n( 'wikilambda-function-usage-widget-title' ).text() }}
		</template>

		<!-- Widget main -->
		<template #main>
			<cdx-progress-indicator v-if="isLoading">
				{{ i18n( 'wikilambda-loading' ).text() }}
			</cdx-progress-indicator>
			<p
				v-else-if="hasError"
				class="ext-wikilambda-app-function-usage-widget__error"
				data-testid="function-usage-error"
			>
				{{ i18n( 'wikilambda-function-usage-widget-error' ).text() }}
			</p>
			<div v-else class="ext-wikilambda-app-function-usage-widget__counts">
				<div
					v-for="count in counts"
					:key="count.key"
					class="ext-wikilambda-app-function-usage-widget__count"
					:data-testid="`function-usage-${ count.key }`"
				>
					<span class="ext-wikilambda-app-function-usage-widget__count-value">
						{{ count.value }}
					</span>
					<span class="ext-wikilambda-app-function-usage-widget__count-label">
						<cdx-icon :icon="count.icon" size="small"></cdx-icon>
						{{ count.label }}
					</span>
				</div>
			</div>
		</template>

		<!-- Widget footer -->
		<template #footer>
			<div class="ext-wikilambda-app-function-usage-widget__details">
				<a :href="usageUrl" data-testid="function-usage-details-link">
					{{ i18n( 'wikilambda-function-usage-widget-details' ).text() }}
				</a>
			</div>
		</template>
	</wl-widget-base>
</template>

<script>
const { computed, defineComponent, inject, onMounted, onUnmounted, ref } = require( 'vue' );

const Constants = require( '../../../Constants.js' );
const icons = require( '../../../../lib/icons.json' );
const useMainStore = require( '../../../store/index.js' );
const { fetchFunctionUsage } = require( '../../../utils/apiUtils.js' );

// Base components
const WidgetBase = require( '../../base/WidgetBase.vue' );
// Codex components
const { CdxIcon, CdxProgressIndicator } = require( '../../../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-function-usage-widget',
	components: {
		'wl-widget-base': WidgetBase,
		'cdx-icon': CdxIcon,
		'cdx-progress-indicator': CdxProgressIndicator
	},
	props: {
		functionZid: {
			type: String,
			required: true
		}
	},
	setup( props ) {
		const i18n = inject( 'i18n' );
		const store = useMainStore();

		// State
		const isLoading = ref( true );
		const hasError = ref( false );
		const usage = ref( { pages: 0, wikis: 0, pagesLimited: false } );
		let abortController = null;

		/**
		 * The two counts to show side by side. The labels are bare nouns rather than
		 * {{PLURAL:}} messages: the number is rendered as its own, larger element beside
		 * the label, and a message whose parameter selects a plural form without ever
		 * printing it cannot be translated correctly into every language.
		 *
		 * The page count is capped, so show it as "1,000+" when the real total is higher.
		 * The wiki count is never capped.
		 *
		 * @return {Array}
		 */
		const counts = computed( () => [
			{ key: 'pages', icon: icons.cdxIconArticle, limited: usage.value.pagesLimited },
			{ key: 'wikis', icon: icons.cdxIconLogoWikimedia, limited: false }
		].map( ( { key, icon, limited } ) => {
			const number = mw.language.convertNumber( usage.value[ key ] );
			return {
				key,
				icon,
				value: limited ?
					i18n( 'wikilambda-function-usage-widget-count-limited', number ).text() :
					number,
				label: i18n( `wikilambda-function-usage-widget-${ key }` ).text()
			};
		} ) );

		/**
		 * Link to the Special page that lists the using pages in full.
		 *
		 * @return {string}
		 */
		const usageUrl = computed( () => new mw.Title(
			`${ Constants.PATHS.FUNCTION_USAGE_TITLE }/${ props.functionZid }`
		).getUrl( { uselang: store.getUserLangCode } ) );

		// Lifecycle
		onMounted( () => {
			abortController = new AbortController();
			fetchFunctionUsage( { zid: props.functionZid, signal: abortController.signal } )
				.then( ( data ) => {
					usage.value = data;
				} )
				.catch( () => {
					hasError.value = true;
				} )
				.finally( () => {
					isLoading.value = false;
				} );
		} );

		onUnmounted( () => {
			// Drop the request if the user navigates away before it lands.
			if ( abortController ) {
				abortController.abort();
			}
		} );

		return {
			counts,
			hasError,
			i18n,
			isLoading,
			usageUrl
		};
	}
} );
</script>

<style lang="less">
@import '../../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-function-usage-widget {
	.ext-wikilambda-app-function-usage-widget__counts {
		display: flex;
	}

	.ext-wikilambda-app-function-usage-widget__count {
		display: flex;
		flex-direction: column;
		// Split the row evenly, whatever width the two numbers need, so the divider between
		// them stays put as the counts change. min-width lets a long number wrap inside its
		// own half rather than pushing the divider off centre.
		flex: 1 1 50%;
		min-width: 0;
	}

	// Divider between the halves. On the second one, so there is none on the outer edges.
	.ext-wikilambda-app-function-usage-widget__count + .ext-wikilambda-app-function-usage-widget__count {
		border-left: @border-subtle;
		padding-left: @spacing-75;
	}

	.ext-wikilambda-app-function-usage-widget__count-value {
		color: @color-base;
		font-size: @font-size-xx-large;
		font-weight: @font-weight-bold;
		line-height: @line-height-xx-small;
	}

	.ext-wikilambda-app-function-usage-widget__count-label {
		align-items: center;
		color: @color-subtle;
		display: flex;
		font-size: @font-size-small;
		gap: @spacing-25;
	}

	.ext-wikilambda-app-function-usage-widget__error {
		color: @color-subtle;
	}

	.ext-wikilambda-app-function-usage-widget__details {
		font-size: @font-size-small;
		margin-top: @spacing-125;
	}
}
</style>
