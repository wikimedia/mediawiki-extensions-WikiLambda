<!--
	WikiLambda Vue component for the next steps after a function search
	in Abstract content that found nothing: suggest the function to the
	community, create it, or browse the functions. For a field that expects
	an HTML fragment, browse the useful functions for article composition.
	For other fields, browse the functions on Wikifunctions that return
	the type of the field.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<ul class="ext-wikilambda-app-function-search-next-steps">
		<li
			v-for="step in steps"
			:key="step.id"
			class="ext-wikilambda-app-function-search-next-steps__item"
			:data-testid="`function-search-next-step-${ step.id }`"
		>
			<!-- A new tab keeps the unsaved content in the editor -->
			<a :href="step.url" target="_blank">{{ step.title }}</a>
			<span class="ext-wikilambda-app-function-search-next-steps__description">
				{{ step.description }}
			</span>
		</li>
	</ul>
</template>

<script>
const { computed, defineComponent, inject } = require( 'vue' );

const Constants = require( '../../Constants.js' );
const { generateWikifunctionsPageUrl } = require( '../../utils/urlUtils.js' );

module.exports = exports = defineComponent( {
	name: 'wl-function-search-next-steps',
	props: {
		/**
		 * The type that the field expects. It sets the last link (see steps).
		 */
		returnType: {
			type: String,
			required: false,
			default: undefined
		}
	},
	setup( props ) {
		const i18n = inject( 'i18n' );

		/**
		 * Returns the next steps, each with a link and a description:
		 * * the page of Abstract Wikipedia where users suggest a new function
		 * * the function editor on Wikifunctions
		 * * for an HTML fragment: the page of Abstract Wikipedia with useful
		 *   functions for article composition
		 * * for another type: the list of functions on Wikifunctions, with
		 *   only the functions that return the given type, if any
		 *
		 * @return {Array}
		 */
		const steps = computed( () => [
			{
				id: 'suggest',
				url: new mw.Title( Constants.PATHS.SUGGESTED_FUNCTIONS_TITLE ).getUrl(),
				title: i18n( 'wikilambda-abstract-function-search-suggest-title' ).text(),
				description: i18n( 'wikilambda-abstract-function-search-suggest-description' ).text()
			},
			{
				id: 'create',
				url: generateWikifunctionsPageUrl( {
					title: Constants.PATHS.CREATE_OBJECT_TITLE,
					params: { zid: Constants.Z_FUNCTION }
				} ),
				title: i18n( 'wikilambda-abstract-function-search-create-title' ).text(),
				description: i18n( 'wikilambda-abstract-function-search-create-description' ).text()
			},
			props.returnType === Constants.Z_HTML_FRAGMENT ?
				{
					id: 'useful',
					url: new mw.Title( Constants.PATHS.USEFUL_FUNCTIONS_TITLE ).getUrl(),
					title: i18n( 'wikilambda-abstract-function-search-useful-title' ).text(),
					description: i18n( 'wikilambda-abstract-function-search-useful-description' ).text()
				} :
				{
					id: 'view-all',
					url: generateWikifunctionsPageUrl( {
						title: `${ Constants.PATHS.LIST_OBJECTS_BY_TYPE_TITLE }/${ Constants.Z_FUNCTION }`,
						// eslint-disable-next-line camelcase
						params: props.returnType ? { return_type: props.returnType } : {}
					} ),
					title: i18n( 'wikilambda-abstract-function-search-view-all-title' ).text(),
					description: i18n( 'wikilambda-abstract-function-search-view-all-description' ).text()
				}
		] );

		return {
			steps
		};
	}
} );
</script>

<style lang="less">
@import '../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-function-search-next-steps {
	margin: 0;
	padding: 0;
	list-style: none;
	white-space: normal;

	.ext-wikilambda-app-function-search-next-steps__item {
		margin: 0;
		padding: @spacing-25 0;
	}

	.ext-wikilambda-app-function-search-next-steps__description {
		display: block;
		color: @color-subtle;
		font-size: @font-size-small;
	}
}
</style>
