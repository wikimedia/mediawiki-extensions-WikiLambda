<template>
	<div>
		<div class="ext-wikilambda-function-definition ext-wikilambda-function-definition__two-cols">
			<main class="ext-wikilambda-function-definition__content">
				<tab-container
					:tabs="tabs"
				>
				</tab-container>
			</main>
			<aside
				class="ext-wikilambda-function-definition__sidebar"
				:aria-label="$i18n('wikilambda-editor-additional-details-label')">
			</aside>
		</div>
	</div>
</template>

<script>
var TabContainer = require( '../components/base/TabContainer.vue' ),
	icons = require( './../../../lib/icons.js' );
module.exports = {
	name: 'function-definition',
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
					icon: icons.sdIconCheck,
					title: this.$i18n( 'wikilambda-editor-fn-step-function-definition' ).text(),
					disabled: false // this should be computed
				},
				{
					status: 'inactive',
					icon: icons.sdIconCheck,
					title: this.$i18n( 'wikilambda-editor-fn-step-implementations' ).text(),
					disabled: false
				},
				{
					status: 'disabled',
					icon: icons.sdIconCheck,
					title: this.$i18n( 'wikilambda-editor-fn-step-tests' ).text(),
					disabled: true
				}
			]
		};
	}
};
</script>

<style lang="less">
@import './../../lib/wikimedia-ui-base.less';

.ext-wikilambda-function-definition {
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
