<!--
	WikiLambda Vue component for a Typed List Type.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-app-typed-list-type" data-testid="z-typed-list-type">
		<wl-z-object-key-value
			:row-id="rowId"
			:edit="edit"
			:list-item-type="listItemType"
			@change-event="changeType"
		></wl-z-object-key-value>
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );
const { mapActions } = require( 'pinia' );

const typeMixin = require( '../../mixins/typeMixin.js' );
const useMainStore = require( '../../store/index.js' );

module.exports = exports = defineComponent( {
	name: 'wl-z-typed-list-type',
	components: {
		//
	},
	mixins: [ typeMixin ],
	props: {
		rowId: {
			type: Number,
			required: false,
			default: 0
		},
		edit: {
			type: Boolean,
			required: true
		},
		parentRowId: {
			type: Number,
			default: undefined
		},
		listItemType: {
			type: [ String, Object ],
			default: null
		}
	},
	methods: Object.assign( {}, mapActions( useMainStore, [
		'handleListTypeChange'
	] ), {

		/**
		 * Handles the change of the type of the list.
		 *
		 * @param {Object} payload
		 * @param {string} payload.value - The new type of the list.
		 * @return {void}
		 */
		changeType: function ( payload ) {
			this.handleListTypeChange( {
				parentRowId: this.parentRowId,
				newListItemType: payload.value
			} );
		}
	} ),
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
