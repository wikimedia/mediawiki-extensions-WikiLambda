<!--
	WikiLambda Vue component for a Typed List Type.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-app-typed-list-type" data-testid="z-typed-list-type">
		<wl-z-object-key-value
			:key-path="keyPath + '.0'"
			:object-value="objectValue"
			:edit="edit"
			@typed-list-type-changed="$emit( 'type-changed', $event )"
		></wl-z-object-key-value>
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );

const typeMixin = require( '../../mixins/typeMixin.js' );

module.exports = exports = defineComponent( {
	name: 'wl-z-typed-list-type',
	components: {
		//
	},
	mixins: [ typeMixin ],
	props: {
		keyPath: {
			type: String,
			required: true
		},
		objectValue: {
			type: Object,
			required: true
		},
		edit: {
			type: Boolean,
			required: true
		}
	},
	beforeCreate: function () {
		this.$options.components[ 'wl-z-object-key-value' ] = require( './ZObjectKeyValue.vue' );
	}
} );
</script>

<style lang="less">
@import '../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-typed-list-type {
	margin-bottom: @wl-key-value-set-margin-bottom;
}
</style>
