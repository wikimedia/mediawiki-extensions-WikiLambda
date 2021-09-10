<template>
	<fn-editor-base>
		<template #title>
			{{ $i18n( 'wikilambda-editor-write-title' ) }}
		</template>
		<template #subtitle>
			{{ $i18n( 'wikilambda-editor-write-subtitle' ) }}
		</template>

		<div v-for="zobjectId in getNewImplementationIds"
			:key="zobjectId"
		>
			<z-implementation
				:zobject-id="findImplementationId( zobjectId )"
			></z-implementation>

			<button @click="saveAdHocImplementation(zobjectId)">
				{{ $i18n( 'wikilambda-editor-write-save-button' ) }}
			</button>
		</div>
	</fn-editor-base>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	FnEditorBase = require( './FnEditorBase.vue' ),
	ZImplementation = require( '../types/ZImplementation.vue' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions;

module.exports = {
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
		'getNewImplementationIds',
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
		if ( this.getNewImplementationIds.length === 0 ) {
			this.createNewImplementation();
		}
	}
};
</script>
