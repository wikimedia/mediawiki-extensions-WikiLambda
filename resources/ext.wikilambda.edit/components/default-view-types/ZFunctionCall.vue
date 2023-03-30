<template>
	<!--
		WikiLambda Vue component for Z7/Function Call objects.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-function-call">
		<cdx-icon :icon="icon"></cdx-icon>
		<wl-z-object-to-string :row-id="rowId">
		</wl-z-object-to-string>
	</div>
</template>

<script>
var CdxIcon = require( '@wikimedia/codex' ).CdxIcon,
	ZObjectToString = require( './ZObjectToString.vue' ),
	icons = require( '../../../lib/icons.json' );

// @vue/component
module.exports = exports = {
	name: 'wl-z-function-call',
	components: {
		'wl-z-object-to-string': ZObjectToString,
		'cdx-icon': CdxIcon
	},
	props: {
		rowId: {
			type: Number,
			required: false,
			default: 0
		}
	},
	data: function () {
		return {
			icon: icons.cdxIconFunction
		};
	}
};
</script>

<style lang="less">
@import '../../ext.wikilambda.edit.less';

.ext-wikilambda-function-call {
	display: flex;
	flex-flow: row wrap;
	justify-content: flex-start;
	gap: @spacing-50;
}
</style>
