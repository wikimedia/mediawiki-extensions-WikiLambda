<template>
	<div>
		<div class="ext-wikilambda-function-view ext-wikilambda-function-view__two-cols">
			<div class="ext-wikilambda-function-view-navbar">
				<tab-container
					:tabs="tabs"
					:active-tab="$route.name"
					@click="selectTab"
				>
				</tab-container>
				<router-view></router-view>
			</div>
			<main class="ext-wikilambda-function-view__content">
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
module.exports = {
	name: 'function-view',
	components: {
		'tab-container': TabContainer
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
					disabled: false
				},
				{
					status: 'inactive',
					id: 'functionTests',
					icon: icons.sdIconCheck,
					title: this.$i18n( 'wikilambda-editor-fn-step-tests' ).text(),
					disabled: false
				}
			]
		};
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
