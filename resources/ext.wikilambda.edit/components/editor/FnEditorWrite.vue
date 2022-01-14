<template>
	<!--
		WikiLambda Vue component for setting ZImplementations inside the Function editor.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<fn-editor-base>
		<template #title>
			{{ $i18n( 'wikilambda-editor-write-title' ) }}
		</template>
		<template #subtitle>
			{{ $i18n( 'wikilambda-editor-write-subtitle' ) }}
		</template>
		<z-implementation
			v-if="getNewImplementationId"
			:zobject-id="findImplementationId( getNewImplementationId )"
		></z-implementation>

		<button @click="saveAdHocImplementation( getNewImplementationId )">
			{{ $i18n( 'wikilambda-editor-write-save-button' ) }}
		</button>
	</fn-editor-base>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	FnEditorBase = require( './FnEditorBase.vue' ),
	ZImplementation = require( '../types/ZImplementation.vue' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions;

// @vue/component
module.exports = {
	name: 'FnEditorWrite',
	components: {
		'fn-editor-base': FnEditorBase,
		'z-implementation': ZImplementation
	},
	props: {
		zobjectId: {
			type: Number,
			default: 0
		}
	},
	computed: $.extend( mapGetters( [
		'getNewImplementationId',
		'getZObjectChildrenById',
		'getNestedZObjectById'
	] ), {
		zImplementationId: function () {

			var val = this.getNestedZObjectById( 0, [
				Constants.Z_PERSISTENTOBJECT_VALUE,
				Constants.Z_FUNCTION_IMPLEMENTATIONS
			] );

			return val.id;
		},
		zImplementationList: function () {
			return this.getZObjectChildrenById( this.zImplementationId );
		}
	} ),
	methods: $.extend( mapActions( [
		'createNewImplementation',
		'saveNewImplementation'
	] ), {
		findImplementationId: function ( zobjectId ) {
			return this.getNestedZObjectById( zobjectId, [
				Constants.Z_PERSISTENTOBJECT_VALUE
			] ).id;
		},
		saveAdHocImplementation: function ( implementationId ) {
			this.saveNewImplementation( {
				implementationId: implementationId,
				nextImplementationIndex: this.zImplementationList.length,
				parent: this.zImplementationId
			} ).then( function () {
				this.$emit( 'navigate-to', 'attach' );
			}.bind( this ) );
		}
	} ),
	mounted: function () {
		if ( !this.getNewImplementationId ) {
			this.createNewImplementation();
		}
	}
};
</script>
