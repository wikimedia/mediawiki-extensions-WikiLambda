<!--
	WikiLambda Vue component for rendering a set of ZObjectKeyValue
	components, which is the fallback view for types that don't have
	a custom component and for ZObjects that are viewed in expanded mode.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div
		class="ext-wikilambda-app-object-key-value-set"
		:class="nestingDepthClass"
		data-testid="z-object-key-value-set"
	>
		<wl-z-object-key-value
			v-for="childKey in childKeys"
			:key="childKey"
			:key-path="`${ keyPath }.${ childKey }`"
			:object-value="objectValue[ childKey ]"
			:edit="edit"
			:parent-type="type"
			:parent-list-item-type="parentListItemType"
			@set-type="$emit( 'set-type', $event )"
			@set-value="$emit( 'set-value', $event )"
		></wl-z-object-key-value>
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );

const zobjectMixin = require( '../../mixins/zobjectMixin.js' );

module.exports = exports = defineComponent( {
	name: 'wl-z-object-key-value-set',
	components: {
		// Leave components as an empty object to add the ObjectKeyValue later
	},
	mixins: [ zobjectMixin ],
	props: {
		keyPath: {
			type: String,
			required: true
		},
		objectValue: {
			type: [ Object, Array ],
			required: false,
			default: undefined
		},
		edit: {
			type: Boolean,
			required: true
		},
		type: {
			type: String,
			required: true
		},
		parentListItemType: {
			type: [ String, Object ],
			default: undefined
		}
	},
	computed: {
		/**
		 * Returns the css class that identifies the nesting level
		 *
		 * @return {string}
		 */
		nestingDepthClass: function () {
			return `ext-wikilambda-app-key-level--${ this.depth || 0 }`;
		},
		/**
		 * Returns the array of child keys to render with ZObjectKeyValue components
		 *
		 * @return {Array}
		 */
		childKeys: function () {
			return this.objectValue ? Object.keys( this.objectValue ) : [];
		}
	},
	beforeCreate: function () {
		// Need to delay require of ZObjectKeyValue to avoid loop
		this.$options.components[ 'wl-z-object-key-value' ] = require( './ZObjectKeyValue.vue' );
	}
} );
</script>

<style lang="less">
@import '../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-object-key-value-set {
	margin-left: -@spacing-25;

	/* Make sure the last child doesn't have a margin bottom */
	.ext-wikilambda-app-object-key-value:last-child {
		> .ext-wikilambda-app-key-value-block {
			margin-bottom: @spacing-0;
		}
	}
}
</style>
