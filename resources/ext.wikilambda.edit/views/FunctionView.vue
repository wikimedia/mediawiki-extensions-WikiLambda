<template>
	<!--
		WikiLambda Vue component for the special view of a ZFunction object.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div>
		<div class="ext-wikilambda-function-view-navbar">
			<tab-container
				:tabs="tabs"
				:active-tab="$route.name"
				@click="selectTab"
			>
			</tab-container>
		</div>
		<div class="ext-wikilambda-function-view ext-wikilambda-function-view__two-cols">
			<main class="ext-wikilambda-function-view__content">
				<router-view></router-view>
			</main>
			<aside
				class="ext-wikilambda-function-view__sidebar"
				:aria-label="$i18n( 'wikilambda-editor-additional-details-label' )">
			</aside>
		</div>
	</div>
</template>

<script>
var TabContainer = require( '../components/base/TabContainer.vue' ),
	Constants = require( '../../../ext.wikilambda.edit/Constants.js' ),
	icons = require( './../../../lib/icons.js' );

// @vue/component
module.exports = {
	name: 'FunctionView',
	components: {
		'tab-container': TabContainer
	},
	data: function () {
		return {
			// TODO: remove hardcoded data with real application data (T297438)
			// TODO: load suitable icons(T297437)
			tabs: [
				{
					status: 'active',
					id: 'functionDefinition', // used for routing
					icon: icons.sdIconCheck,
					title: this.$i18n( 'wikilambda-editor-fn-step-function-definition' ).text(),
					disabled: false // this should be computed
				},
				{
					status: 'inactive',
					id: 'functionImplementation',
					icon: icons.sdIconCheck,
					title: this.$i18n( 'wikilambda-editor-fn-step-implementations' ).text(),
					disabled: false,
					tooltip: {
						icon: icons.sdIconInfoFilled,
						header: this.$i18n( 'wikilambda-editor-fn-tests-tooltip-header' ).text(),
						content: this.$i18n( 'wikilambda-editor-fn-tests-tooltip-content' ).text(),
						visible: false
					}
				},
				{
					status: 'inactive',
					id: 'functionTests',
					icon: icons.sdIconCheck,
					title: this.$i18n( 'wikilambda-editor-fn-step-tests' ).text(),
					disabled: true,
					tooltip: {
						icon: icons.sdIconInfoFilled,
						header: this.$i18n( 'wikilambda-editor-fn-tests-tooltip-header' ).text(),
						content: this.$i18n( 'wikilambda-editor-fn-tests-tooltip-content' ).text(),
						visible: true
					}
				}
			]
		};
	},
	methods: {
		selectTab: function ( tab ) {
			this.$router.push( {
				name: tab,
				query: {
					type: 'newDesign',
					zid: Constants.Z_FUNCTION
				}
			} );
		}
	}
};
</script>

<style lang="less">
@import './../../lib/wikimedia-ui-base.less';

.ext-wikilambda-function-view {
	display: grid;

	&__sidebar {
		background: #f0f0f0;
		padding: 1em;
	}

	&__content {
		position: relative;
		flex: 0 1 100%;
		margin: 0 3em;
		display: flex;
		flex-direction: column;

		section {
			width: 80%;
			margin: 45px auto;
		}
	}

	&__two-cols {
		grid-template-columns: 1fr 300px;

		& > aside {
			grid-column-start: 2;
		}
	}
}
</style>
